import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { KIND_IDS, parseFrontmatter, serializeFrontmatter } from "./lib.js";
import { acquireOperationLock } from "./operation-lock.js";
import { verifyRemotePush } from "./push-verification.js";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(toolDir, "..", "..");

// Mirrors publish.js: STUDIO_REPO_ROOT redirects to a fixture repository
// for tests.
function getPaths() {
  const repoRoot = process.env.STUDIO_REPO_ROOT
    ? path.resolve(process.env.STUDIO_REPO_ROOT)
    : defaultRepoRoot;
  return {
    repoRoot,
    localRoot: path.join(repoRoot, ".local-content"),
    siteRoot: path.join(repoRoot, "content", "site"),
    webRoot: path.join(repoRoot, "apps", "web"),
  };
}

let inFlight = false;

export function isBusy() {
  return inFlight;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? getPaths().repoRoot,
    encoding: "utf8",
    shell: false,
    timeout: options.timeoutMs ?? 120000,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: (result.stdout ?? "").toString(),
    stderr: (result.stderr ?? "").toString(),
  };
}

function assetReferences(doc) {
  const references = new Set();
  if (doc.cover) {
    references.add(path.basename(doc.cover));
  }
  const patterns = [/!\[[^\]]*\]\((?:assets\/)?([^)\s]+)\)/g, /src="(?:assets\/)?([^"]+)"/g];
  for (const pattern of patterns) {
    for (const match of String(doc.body ?? "").matchAll(pattern)) {
      if (match[1]) {
        references.add(path.basename(match[1].split("#")[0].split("?")[0]));
      }
    }
  }
  return [...references].filter((name) => name && name.includes("."));
}

function serializeRestoredDraft(frontmatter, body) {
  const markdown = serializeFrontmatter(frontmatter, body);
  return markdown.replace(/^pinned: "true"$/m, "pinned: true");
}

function copySiteAssetsToDraft(names) {
  const { localRoot, siteRoot } = getPaths();
  const localAssets = path.join(localRoot, "assets");
  const siteAssets = path.join(siteRoot, "assets");
  fs.mkdirSync(localAssets, { recursive: true });
  for (const name of names) {
    const source = path.join(siteAssets, name);
    const target = path.join(localAssets, name);
    if (!fs.existsSync(source)) {
      return { ok: false, stage: "asset", message: `正式资产不存在，无法恢复草稿预览：${name}` };
    }
    if (fs.existsSync(target)) {
      if (!fs.readFileSync(source).equals(fs.readFileSync(target))) {
        return {
          ok: false,
          stage: "asset",
          message: `本机已有同名但内容不同的资产，未覆盖：${name}；请先处理后再下线`,
        };
      }
      continue;
    }
    fs.copyFileSync(source, target);
  }
  return { ok: true };
}

function generatedPaths(kind, slug) {
  return [
    `content/public/metadata/${kind}.json`,
    "content/public/metadata/search.json",
    "apps/web/public/feed.xml",
  ];
}

function operationPaths(kind, slug, assetNames) {
  return [
    `content/site/${kind}/${slug}.md`,
    ...assetNames.map((name) => `content/site/assets/${name}`),
    ...generatedPaths(kind, slug),
  ];
}

function createSnapshot(pathsToSave) {
  const backupRoot = fs.mkdtempSync(path.join(os.tmpdir(), "studio-unpublish-"));
  const records = pathsToSave.map((target, index) => {
    const backup = path.join(backupRoot, String(index));
    const exists = fs.existsSync(target);
    if (exists) {
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      fs.cpSync(target, backup, { recursive: true });
    }
    return { target, backup, exists };
  });

  return {
    restore() {
      for (const record of records) {
        fs.rmSync(record.target, { recursive: true, force: true });
        if (record.exists) {
          fs.mkdirSync(path.dirname(record.target), { recursive: true });
          fs.cpSync(record.backup, record.target, { recursive: true });
        }
      }
    },
    cleanup() {
      fs.rmSync(backupRoot, { recursive: true, force: true });
    },
  };
}

function injectedFailure(stage) {
  return process.env.STUDIO_FAIL_STAGE === stage
    ? { ok: false, stage, message: `故障注入：${stage} 阶段失败` }
    : null;
}

function rollbackCommit(commit) {
  if (!commit) {
    return;
  }
  const head = run("git", ["rev-parse", "HEAD"]);
  if (head.ok && head.stdout.trim() === commit) {
    run("git", ["reset", "--mixed", "HEAD^"]);
  }
}

// Per the confirmed flow: copy the published document back to the local
// draft area, verify it reads back, only then remove the canonical copy.
export function unpublishToDraft(kind, slug) {
  if (inFlight) {
    return { ok: false, stage: "busy", message: "已有下线任务在进行中，请稍后再试" };
  }
  const { repoRoot } = getPaths();
  const operationLock = acquireOperationLock(repoRoot, `unpublish:${kind}/${slug}`);
  if (!operationLock.ok) {
    return operationLock;
  }
  inFlight = true;

  try {
    const { repoRoot, localRoot, siteRoot, webRoot } = getPaths();
    const siteFile = path.join(siteRoot, kind, `${slug}.md`);
    if (!fs.existsSync(siteFile)) {
      return { ok: false, stage: "locate", message: "正式内容不存在，可能已下线" };
    }

    const doc = parseFrontmatter(fs.readFileSync(siteFile, "utf8"));
    const draftDir = path.join(localRoot, kind);
    fs.mkdirSync(draftDir, { recursive: true });
    const draftFile = path.join(draftDir, `${slug}.md`);
    const preservedExistingDraft = fs.existsSync(draftFile);
    const references = new Set(assetReferences({ ...doc.frontmatter, body: doc.body }));
    const snapshot = createSnapshot([
      siteFile,
      draftFile,
      ...[...references].map((name) => path.join(siteRoot, "assets", name)),
      ...[...references].map((name) => path.join(localRoot, "assets", name)),
      path.join(repoRoot, "content", "public"),
      path.join(repoRoot, "apps", "web", "public", "assets"),
      path.join(repoRoot, "apps", "web", "public", "feed.xml"),
    ]);
    let committedHash = null;
    let succeeded = false;
    let rollbackOnFailure = true;

    try {
      const copiedAssets = copySiteAssetsToDraft([...references]);
      if (!copiedAssets.ok) {
        return copiedAssets;
      }

      if (!preservedExistingDraft) {
        const markdown = serializeRestoredDraft(
          {
            ...doc.frontmatter,
            title: doc.frontmatter.title ?? slug,
            slug,
            content_type: kind === "gallery" ? "gallery" : "note",
            status: "draft",
          },
          doc.body,
        );
        fs.writeFileSync(draftFile, markdown, "utf8");
      }

      const verify = parseFrontmatter(fs.readFileSync(draftFile, "utf8"));
      if (!verify.frontmatter || verify.frontmatter.slug !== slug || !verify.body) {
        return {
          ok: false,
          stage: "verify",
          message: "草稿回读校验失败，已保留正式内容；请检查 .local-content 后重试",
        };
      }

      fs.rmSync(siteFile);

      for (const otherKind of KIND_IDS) {
        const dir = path.join(siteRoot, otherKind);
        const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".md")) : [];
        for (const file of files) {
          const other = parseFrontmatter(fs.readFileSync(path.join(dir, file), "utf8"));
          for (const ref of assetReferences({ ...other.frontmatter, body: other.body })) {
            references.delete(ref);
          }
        }
      }

      const siteAssets = path.join(siteRoot, "assets");
      let removedAssets = 0;
      const removedAssetNames = [];
      if (fs.existsSync(siteAssets)) {
        for (const name of references) {
          const assetFile = path.join(siteAssets, name);
          if (fs.existsSync(assetFile)) {
            fs.rmSync(assetFile);
            removedAssets += 1;
            removedAssetNames.push(name);
          }
        }
      }

      const generate = regenerateAndCheck();
      if (!generate.ok) {
        return { ...generate, message: `${generate.message}\n\n操作已回滚，正式内容仍保留。` };
      }

      const gitResult = commitAndPush(`content: unpublish ${slug}`, kind, slug, removedAssetNames);
      committedHash = gitResult.fullCommit ?? null;
      rollbackOnFailure = gitResult.rollback !== false;
      if (!gitResult.ok) {
        return gitResult;
      }

      succeeded = true;
      return {
        ok: true,
        slug,
        commit: gitResult.commit,
        branch: gitResult.branch,
        removedAssets,
        preservedExistingDraft,
        message: `已下线并推送 ${gitResult.commit}；内容已复制回本机草稿`,
      };
    } finally {
      if (!succeeded && rollbackOnFailure) {
        rollbackCommit(committedHash);
        snapshot.restore();
      }
      snapshot.cleanup();
    }
  } finally {
    inFlight = false;
    operationLock.release();
  }
}

function regenerateAndCheck() {
  const { repoRoot, webRoot } = getPaths();
  // The builder script always loads from the real repository; only the
  // content directories move via STUDIO_REPO_ROOT.
  const builder = run(
    process.execPath,
    [path.join(defaultRepoRoot, "tools", "site-builder", "build.mjs")],
    {
      timeoutMs: 60000,
      env: { ...process.env, STUDIO_REPO_ROOT: repoRoot },
    },
  );
  if (!builder.ok) {
    return { ok: false, stage: "generate", message: `生成 content/public 失败：\n${builder.stderr || builder.stdout}` };
  }
  const generatedFailure = injectedFailure("generate");
  if (generatedFailure) {
    return generatedFailure;
  }

  const checksFailure = injectedFailure("checks");
  if (checksFailure) {
    return checksFailure;
  }

  if (process.env.STUDIO_E2E === "1") {
    return { ok: true };
  }

  const sync = run(process.execPath, [path.join(webRoot, "scripts", "sync-public-assets.mjs")], {
    cwd: webRoot,
    timeoutMs: 60000,
  });
  if (!sync.ok) {
    return { ok: false, stage: "generate", message: `同步资产失败：\n${sync.stderr || sync.stdout}` };
  }
  const rss = run(process.execPath, [path.join(webRoot, "scripts", "generate-rss.js")], {
    cwd: webRoot,
    timeoutMs: 60000,
  });
  if (!rss.ok) {
    return { ok: false, stage: "generate", message: `生成 RSS 失败：\n${rss.stderr || rss.stdout}` };
  }

  const unit = run(
    process.execPath,
    [path.join(webRoot, "node_modules", "vitest", "vitest.mjs"), "run", "--passWithNoTests"],
    { cwd: webRoot, timeoutMs: 240000 },
  );
  if (!unit.ok) {
    return { ok: false, stage: "checks", message: `测试失败：\n${unit.stdout || unit.stderr}` };
  }

  const build = run(
    process.execPath,
    [path.join(webRoot, "node_modules", "next", "dist", "bin", "next"), "build"],
    { cwd: webRoot, timeoutMs: 600000 },
  );
  if (!build.ok) {
    return { ok: false, stage: "checks", message: `生产构建失败：\n${build.stdout || build.stderr}` };
  }

  return { ok: true };
}

function commitAndPush(message, kind, slug, assetNames) {
  if (process.env.STUDIO_PUBLISH_DRY_RUN === "1") {
    return { ok: true, dryRun: true, commit: "dry-run", branch: "dry-run", message: "DRY-RUN：跳过 Git 步骤" };
  }

  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  const branchName = branch.stdout.trim();
  if (!branch.ok || !branchName || branchName === "HEAD") {
    return { ok: false, stage: "git", message: "无法确定当前正式分支" };
  }

  const staged = run("git", ["diff", "--cached", "--name-only"]);
  if (staged.stdout.trim().length > 0) {
    return { ok: false, stage: "git", message: "暂存区已有内容，请先处理后再下线" };
  }

  const injectedStage = injectedFailure("stage");
  if (injectedStage) {
    return injectedStage;
  }

  const { repoRoot } = getPaths();
  const pathSpecs = operationPaths(kind, slug, assetNames);
  for (const pathSpec of pathSpecs) {
    const add = run("git", ["add", "--", pathSpec]);
    if (!add.ok) {
      run("git", ["reset"]);
      return { ok: false, stage: "git", message: `暂存 ${pathSpec} 失败：\n${add.stderr}` };
    }
  }

  const stagedFiles = run("git", ["diff", "--cached", "--name-only"]);
  const stagedList = stagedFiles.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
  const expected = new Set(pathSpecs.map((item) => path.relative(repoRoot, path.join(repoRoot, item)).replaceAll("\\", "/")));
  const unexpected = stagedList.filter((file) => !expected.has(file));
  if (unexpected.length > 0) {
    run("git", ["reset"]);
    return { ok: false, stage: "git", message: `暂存区出现非内容文件，已回退：\n${unexpected.join("\n")}` };
  }
  if (stagedList.length === 0) {
    return { ok: false, stage: "git", message: "没有可提交的变更" };
  }

  const injectedCommit = injectedFailure("commit");
  if (injectedCommit) {
    run("git", ["reset"]);
    return injectedCommit;
  }

  const parentHash = run("git", ["rev-parse", "HEAD"]).stdout.trim();
  const commit = run("git", ["commit", "-m", message]);
  if (!commit.ok) {
    run("git", ["reset"]);
    return { ok: false, stage: "git", message: `提交失败：\n${commit.stderr || commit.stdout}` };
  }

  const fullHash = run("git", ["rev-parse", "HEAD"]).stdout.trim();
  const hash = run("git", ["rev-parse", "--short", "HEAD"]).stdout.trim();
  const injectedPushUnknown = injectedFailure("push-unknown");
  if (injectedPushUnknown) {
    return {
      ...injectedPushUnknown,
      commit: hash,
      fullCommit: fullHash,
      rollback: false,
      message: "推送失败且无法确认远端状态；已保留本地提交和内容，请核对远端后再处理。",
    };
  }
  const injectedPush = injectedFailure("push");
  if (injectedPush) {
    return { ...injectedPush, commit: hash, fullCommit: fullHash, rollback: true };
  }
  const push = run("git", ["push", "origin", branchName], { timeoutMs: 180000 });
  if (!push.ok) {
    const remoteState = verifyRemotePush(run, branchName, fullHash, parentHash);
    if (remoteState.state === "current") {
      return { ok: true, commit: hash, branch: branchName, pushVerified: true };
    }
    if (remoteState.state === "parent") {
      return {
        ok: false,
        stage: "push",
        message: `推送失败：已确认远端仍是父提交，本次提交 ${hash} 将安全回滚。\n${push.stderr || push.stdout}`,
        commit: hash,
        fullCommit: fullHash,
        rollback: true,
      };
    }
    return {
      ok: false,
      stage: "push-unknown",
      message: `推送失败且无法确认远端状态：本地提交 ${hash} 已保留，未自动回滚。请先执行 git ls-remote --heads origin ${branchName} 核对远端，再决定推送或回退。\n${remoteState.reason || push.stderr || push.stdout}`,
      commit: hash,
      fullCommit: fullHash,
      rollback: false,
    };
  }

  return { ok: true, commit: hash, branch: branchName };
}
