import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { KIND_IDS, parseFrontmatter, nowIsoDate, serializeFrontmatter } from "./lib.js";

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

const STAGE_PATHS = ["content/site", "content/public/metadata", "apps/web/public/feed.xml"];

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

// Per the confirmed flow: copy the published document back to the local
// draft area, verify it reads back, only then remove the canonical copy.
export function unpublishToDraft(kind, slug) {
  if (inFlight) {
    return { ok: false, stage: "busy", message: "已有下线任务在进行中，请稍后再试" };
  }
  inFlight = true;

  try {
    const { localRoot, siteRoot, webRoot } = getPaths();
    const siteFile = path.join(siteRoot, kind, `${slug}.md`);
    if (!fs.existsSync(siteFile)) {
      return { ok: false, stage: "locate", message: "正式内容不存在，可能已下线" };
    }

    const doc = parseFrontmatter(fs.readFileSync(siteFile, "utf8"));
    const draftDir = path.join(localRoot, kind);
    fs.mkdirSync(draftDir, { recursive: true });
    const draftFile = path.join(draftDir, `${slug}.md`);

    if (!fs.existsSync(draftFile)) {
      const markdown = serializeFrontmatter(
        {
          title: doc.frontmatter.title ?? slug,
          slug,
          content_type: kind === "gallery" ? "gallery" : "note",
          status: "draft",
          summary: typeof doc.frontmatter.summary === "string" ? doc.frontmatter.summary : "",
          tags: Array.isArray(doc.frontmatter.tags) ? doc.frontmatter.tags : [],
          cover: typeof doc.frontmatter.cover === "string" ? doc.frontmatter.cover : null,
          created: typeof doc.frontmatter.created === "string" ? doc.frontmatter.created : nowIsoDate(),
          updated: nowIsoDate(),
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

    const references = new Set(assetReferences({ ...doc.frontmatter, body: doc.body }));
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
    if (fs.existsSync(siteAssets)) {
      for (const name of references) {
        const assetFile = path.join(siteAssets, name);
        if (fs.existsSync(assetFile)) {
          fs.rmSync(assetFile);
          removedAssets += 1;
        }
      }
    }

    const generate = regenerateAndCheck();
    if (!generate.ok) {
      return { ...generate, message: `${generate.message}\n\n正式 md 已移除但生成未完成，可重新运行 build:content。` };
    }

    const gitResult = commitAndPush(`content: unpublish ${slug}`);
    if (!gitResult.ok) {
      return gitResult;
    }

    return {
      ok: true,
      slug,
      commit: gitResult.commit,
      branch: gitResult.branch,
      removedAssets,
      message: `已下线并推送 ${gitResult.commit}；内容已复制回本机草稿`,
    };
  } finally {
    inFlight = false;
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

function commitAndPush(message) {
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

  for (const pathSpec of STAGE_PATHS) {
    const add = run("git", ["add", "--", pathSpec]);
    if (!add.ok) {
      run("git", ["reset"]);
      return { ok: false, stage: "git", message: `暂存 ${pathSpec} 失败：\n${add.stderr}` };
    }
  }

  const stagedFiles = run("git", ["diff", "--cached", "--name-only"]);
  const stagedList = stagedFiles.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
  const allowedPrefixes = ["content/site/", "content/public/metadata/", "apps/web/public/feed.xml"];
  const unexpected = stagedList.filter((file) => !allowedPrefixes.some((prefix) => file.startsWith(prefix)));
  if (unexpected.length > 0) {
    run("git", ["reset"]);
    return { ok: false, stage: "git", message: `暂存区出现非内容文件，已回退：\n${unexpected.join("\n")}` };
  }
  if (stagedList.length === 0) {
    return { ok: false, stage: "git", message: "没有可提交的变更" };
  }

  const commit = run("git", ["commit", "-m", message]);
  if (!commit.ok) {
    run("git", ["reset"]);
    return { ok: false, stage: "git", message: `提交失败：\n${commit.stderr || commit.stdout}` };
  }

  const hash = run("git", ["rev-parse", "--short", "HEAD"]).stdout.trim();
  const push = run("git", ["push", "origin", branchName], { timeoutMs: 180000 });
  if (!push.ok) {
    return {
      ok: false,
      stage: "push",
      message: `推送失败：本机提交 ${hash} 已创建，稍后可手动执行 git push origin ${branchName} 重试。\n${push.stderr || push.stdout}`,
      commit: hash,
    };
  }

  return { ok: true, commit: hash, branch: branchName };
}
