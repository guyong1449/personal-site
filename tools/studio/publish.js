import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  KIND_IDS,
  extractSummary,
  parseFrontmatter,
  serializeFrontmatter,
  slugify,
} from "./lib.js";
import { acquireOperationLock } from "./operation-lock.js";
import { verifyRemotePush } from "./push-verification.js";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(toolDir, "..", "..");
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

// STUDIO_REPO_ROOT lets tests redirect the whole pipeline to a fixture
// repository; unset means the real repository.
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
  // shell:false everywhere: process.execPath and git resolve as real
  // executables, and shell joining would break the spaced "Program Files"
  // path on Windows.
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
      const value = match[1];
      if (value) {
        references.add(path.basename(value.split("#")[0].split("?")[0]));
      }
    }
  }
  return [...references].filter((name) => name && name.includes("."));
}

function relativeRepoPath(repoRoot, absolutePath) {
  return path.relative(repoRoot, absolutePath).replaceAll("\\", "/");
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
  const backupRoot = fs.mkdtempSync(path.join(os.tmpdir(), "studio-publish-"));
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

export function validateForPublish(kind, slug, doc, fsModule = fs) {
  const errors = [];
  const { localRoot, siteRoot } = getPaths();

  if (!KIND_IDS.includes(kind)) {
    errors.push(`kind "${kind}" 不受支持`);
  }
  if (!doc.title || !doc.title.trim()) {
    errors.push("标题不能为空");
  }
  if (typeof doc.slug !== "string" || !SLUG_PATTERN.test(doc.slug)) {
    errors.push(`frontmatter slug "${doc.slug ?? ""}" 不符合规范（小写字母、数字、连字符）`);
  }
  if (doc.slug !== slug) {
    errors.push(`frontmatter slug "${doc.slug ?? ""}" 必须与当前草稿 slug "${slug}" 一致`);
  }
  if (!SLUG_PATTERN.test(slug)) {
    errors.push(`slug "${slug}" 不符合规范（小写字母、数字、连字符）`);
  }
  if (!doc.body || !doc.body.trim()) {
    errors.push("正文不能为空");
  }
  if (doc.contentType && doc.contentType !== "note" && doc.contentType !== "gallery") {
    errors.push(`content_type "${doc.contentType}" 不合法`);
  }
  const expectedType = kind === "notes" ? "note" : "gallery";
  if (doc.contentType && doc.contentType !== expectedType) {
    errors.push(`content_type "${doc.contentType}" 与目标目录 ${kind} 不一致`);
  }

  if (!Array.isArray(doc.tags) || doc.tags.length === 0) {
    errors.push("标签不能为空，至少需要一个标签");
  }
  const seenTags = new Set();
  for (const tag of Array.isArray(doc.tags) ? doc.tags : []) {
    if (typeof tag !== "string" || !tag.trim()) {
      errors.push(`标签必须是非空字符串：${tag ?? ""}`);
      continue;
    }
    if (seenTags.has(tag)) {
      errors.push(`标签重复：${tag}`);
    }
    seenTags.add(tag);
    if (/\s/.test(tag)) {
      errors.push(`标签不能包含空格：${tag}`);
    }
  }

  const draftAssets = path.join(localRoot, "assets");
  const siteAssets = path.join(siteRoot, "assets");
  const exists = (name) =>
    fsModule.existsSync(path.join(draftAssets, name)) ||
    fsModule.existsSync(path.join(siteAssets, name));

  for (const name of assetReferences(doc)) {
    if (!exists(name)) {
      errors.push(`引用的资产不存在：${name}（需先在草稿资产中上传）`);
    }
  }

  return errors;
}

function copyDraftAssets(names) {
  const { localRoot, siteRoot } = getPaths();
  const draftAssets = path.join(localRoot, "assets");
  const siteAssets = path.join(siteRoot, "assets");
  fs.mkdirSync(siteAssets, { recursive: true });
  let copied = 0;
  for (const name of names) {
    const source = path.join(draftAssets, name);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, path.join(siteAssets, name));
      copied += 1;
    }
  }
  return copied;
}

function findAssetConflicts(names) {
  const { localRoot, siteRoot } = getPaths();
  const conflicts = [];
  for (const name of names) {
    const draftFile = path.join(localRoot, "assets", name);
    const siteFile = path.join(siteRoot, "assets", name);
    if (
      fs.existsSync(draftFile) &&
      fs.existsSync(siteFile) &&
      !fs.readFileSync(draftFile).equals(fs.readFileSync(siteFile))
    ) {
      conflicts.push(name);
    }
  }
  return conflicts;
}

function regeneratePublicSnapshot() {
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
  const injected = injectedFailure("generate");
  if (injected) {
    return injected;
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

  return { ok: true };
}

function runChecks() {
  const injected = injectedFailure("checks");
  if (injected) {
    return injected;
  }
  if (process.env.STUDIO_E2E === "1") {
    return { ok: true };
  }
  const { webRoot } = getPaths();
  const builderTests = run(
    process.execPath,
    ["--test", path.join(defaultRepoRoot, "tools", "site-builder", "tests", "build.test.mjs")],
    { timeoutMs: 120000 },
  );
  if (!builderTests.ok) {
    return { ok: false, stage: "checks", message: `site-builder 测试失败：\n${builderTests.stdout || builderTests.stderr}` };
  }

  const lint = run(process.execPath, [path.join(webRoot, "node_modules", "eslint", "bin", "eslint.js"), "."], {
    cwd: webRoot,
    timeoutMs: 180000,
  });
  if (!lint.ok) {
    return { ok: false, stage: "checks", message: `lint 失败：\n${lint.stdout || lint.stderr}` };
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

function rollbackCommit(commit) {
  if (!commit) {
    return;
  }
  const head = run("git", ["rev-parse", "HEAD"]);
  if (head.ok && head.stdout.trim() === commit) {
    run("git", ["reset", "--mixed", "HEAD^"]);
  }
}

function publishToGit(kind, slug, assetNames) {
  if (process.env.STUDIO_PUBLISH_DRY_RUN === "1") {
    return {
      ok: true,
      dryRun: true,
      commit: "dry-run",
      branch: "dry-run",
      stagedFiles: [],
      message: "DRY-RUN：已通过校验、生成与检查，跳过 Git 暂存/提交/推送",
    };
  }

  const inside = run("git", ["rev-parse", "--is-inside-work-tree"]);
  if (!inside.ok || inside.stdout.trim() !== "true") {
    return { ok: false, stage: "git", message: "当前目录不是 Git 工作区" };
  }

  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  const branchName = branch.stdout.trim();
  if (!branch.ok || !branchName || branchName === "HEAD") {
    return { ok: false, stage: "git", message: "当前处于分离 HEAD 状态，无法确定正式分支" };
  }

  const staged = run("git", ["diff", "--cached", "--name-only"]);
  if (!staged.ok) {
    return { ok: false, stage: "git", message: `无法读取暂存区：\n${staged.stderr}` };
  }
  if (staged.stdout.trim().length > 0) {
    return {
      ok: false,
      stage: "git",
      message: "暂存区已有内容，为避免混入发布提交请先处理（git reset 或完成既有提交）",
    };
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
  const expected = new Set(pathSpecs.map((item) => relativeRepoPath(repoRoot, path.join(repoRoot, item))));
  const unexpected = stagedList.filter((file) => !expected.has(file));
  if (unexpected.length > 0) {
    run("git", ["reset"]);
    return {
      ok: false,
      stage: "git",
      message: `暂存区出现非内容文件，已回退：\n${unexpected.join("\n")}`,
    };
  }
  if (stagedList.length === 0) {
    return { ok: false, stage: "git", message: "没有可提交的内容变更（内容可能未修改）" };
  }

  const injectedCommit = injectedFailure("commit");
  if (injectedCommit) {
    run("git", ["reset"]);
    return injectedCommit;
  }

  const parentHash = run("git", ["rev-parse", "HEAD"]).stdout.trim();
  const commit = run("git", ["commit", "-m", `content: publish ${slug}`]);
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

  return { ok: true, commit: hash, branch: branchName, stagedFiles: stagedList };
}

export function publishDraft(kind, slug) {
  if (inFlight) {
    return { ok: false, stage: "busy", message: "已有发布任务在进行中，请稍后再试" };
  }
  const { repoRoot } = getPaths();
  const operationLock = acquireOperationLock(repoRoot, `publish:${kind}/${slug}`);
  if (!operationLock.ok) {
    return operationLock;
  }
  inFlight = true;

  try {
    const { localRoot, siteRoot } = getPaths();
    const draftFile = path.join(localRoot, kind, `${slug}.md`);
    if (!fs.existsSync(draftFile)) {
      return { ok: false, stage: "validate", message: "本机草稿不存在" };
    }
    const doc = parseFrontmatter(fs.readFileSync(draftFile, "utf8"));
    const normalized = {
      title: doc.frontmatter.title,
      slug: doc.frontmatter.slug,
      contentType: doc.frontmatter.content_type,
      tags: Array.isArray(doc.frontmatter.tags) ? doc.frontmatter.tags : [],
      cover: typeof doc.frontmatter.cover === "string" ? doc.frontmatter.cover : null,
      pinned: doc.frontmatter.pinned === true,
      body: doc.body,
    };

    const errors = validateForPublish(kind, slug, normalized);
    if (errors.length > 0) {
      return { ok: false, stage: "validate", message: `校验未通过：\n${errors.map((e) => `  - ${e}`).join("\n")}` };
    }

    const finalSlug = slugify(normalized.slug, slug);
    const referencedAssets = assetReferences(normalized);
    const conflicts = findAssetConflicts(referencedAssets);
    if (conflicts.length > 0) {
      return {
        ok: false,
        stage: "asset",
        message: `资产重名且内容不同，未覆盖正式资产：${conflicts.join(", ")}`,
      };
    }

    const siteDir = path.join(siteRoot, kind);
    fs.mkdirSync(siteDir, { recursive: true });
    const { repoRoot: currentRepoRoot } = getPaths();
    const snapshot = createSnapshot([
      path.join(siteDir, `${finalSlug}.md`),
      ...referencedAssets.map((name) => path.join(siteRoot, "assets", name)),
      path.join(currentRepoRoot, "content", "public"),
      path.join(currentRepoRoot, "apps", "web", "public", "assets"),
      path.join(currentRepoRoot, "apps", "web", "public", "feed.xml"),
    ]);
    let committedHash = null;
    let succeeded = false;
    let rollbackOnFailure = true;

    try {
      copyDraftAssets(referencedAssets);

      const summary =
        typeof doc.frontmatter.summary === "string" && doc.frontmatter.summary.trim()
          ? doc.frontmatter.summary
          : extractSummary(normalized.body);
      const markdown = serializeFrontmatter(
        {
          title: normalized.title,
          slug: finalSlug,
          content_type: kind === "gallery" ? "gallery" : "note",
          summary,
          tags: normalized.tags,
          cover: normalized.cover,
          created: typeof doc.frontmatter.created === "string" ? doc.frontmatter.created : undefined,
          updated: new Date().toISOString().slice(0, 10),
          pinned: normalized.pinned ? true : undefined,
          ...(kind === "gallery"
            ? {
                art_category:
                  typeof doc.frontmatter.art_category === "string"
                    ? doc.frontmatter.art_category
                    : undefined,
                series:
                  typeof doc.frontmatter.series === "string" ? doc.frontmatter.series : undefined,
              }
            : {}),
        },
        normalized.body,
      );
      fs.writeFileSync(path.join(siteDir, `${finalSlug}.md`), markdown, "utf8");

      const generated = regeneratePublicSnapshot();
      if (!generated.ok) {
        return generated;
      }

      const linkCheck = run(
        process.execPath,
        [path.join(defaultRepoRoot, "apps", "web", "scripts", "check-links.mjs")],
        {
          timeoutMs: 60000,
          env: { ...process.env, STUDIO_REPO_ROOT: repoRoot },
        },
      );
      if (!linkCheck.ok) {
        return {
          ok: false,
          stage: "generate",
          message: `内容完整性检查失败：\n${linkCheck.stdout || linkCheck.stderr}`,
        };
      }

      const checks = runChecks();
      if (!checks.ok) {
        return { ...checks, message: `${checks.message}\n\n操作已回滚，本机草稿仍保留；修复后可重新发布。` };
      }

      const gitResult = publishToGit(kind, finalSlug, referencedAssets);
      committedHash = gitResult.fullCommit ?? null;
      rollbackOnFailure = gitResult.rollback !== false;
      if (!gitResult.ok) {
        return gitResult;
      }

      succeeded = true;
      return {
        ok: true,
        slug: finalSlug,
        commit: gitResult.commit,
        branch: gitResult.branch,
        message: `已提交并推送 ${gitResult.commit}（${gitResult.branch}），Vercel 将自动部署`,
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
