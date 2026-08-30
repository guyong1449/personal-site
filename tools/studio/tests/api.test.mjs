import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { after, before, describe, it } from "node:test";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const fixtureHome = fs.mkdtempSync(path.join(os.tmpdir(), "studio-api-"));
const repoRoot = path.join(fixtureHome, "repo");
const serverFile = fileURLToPath(new URL("../server.js", import.meta.url));
let serverProcess;
let baseUrl;

function write(relativePath, content) {
  const file = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  return file;
}

function noteMarkdown({
  title,
  slug,
  body = "正文内容",
  extra = "",
}) {
  return [
    "---",
    `title: "${title}"`,
    `slug: "${slug}"`,
    'content_type: "note"',
    'status: "draft"',
    extra,
    "---",
    "",
    body,
    "",
  ].filter(Boolean).join("\n");
}

async function request(route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

before(async () => {
  fs.mkdirSync(repoRoot, { recursive: true });
  serverProcess = spawn(process.execPath, [serverFile], {
    cwd: repoRoot,
    env: {
      ...process.env,
      STUDIO_REPO_ROOT: repoRoot,
      STUDIO_PORT: "0",
      STUDIO_E2E: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  const started = new Promise((resolve, reject) => {
    const onData = (chunk) => {
      output += chunk.toString();
      const match = output.match(/studio listening on (http:\/\/127\.0\.0\.1:\d+\/studio)/);
      if (match) {
        serverProcess.stdout.off("data", onData);
        resolve(match[1].replace(/\/studio$/, ""));
      }
    };
    serverProcess.stdout.on("data", onData);
    serverProcess.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    serverProcess.once("error", reject);
    serverProcess.once("exit", (code, signal) => {
      reject(new Error(`Studio exited before startup (${code ?? signal}): ${output}`));
    });
  });

  baseUrl = await started;
  const health = await request("/healthz");
  assert.equal(health.status, 200);
  assert.deepEqual(health.payload, { ok: true });
});

after(async () => {
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill();
    await once(serverProcess, "exit");
  }
  fs.rmSync(fixtureHome, { recursive: true, force: true });
});

describe("Studio API", () => {
  it("imports Markdown successfully and rejects empty or dangerous HTML input", async () => {
    const success = await request("/api/import", {
      method: "POST",
      body: JSON.stringify({
        kind: "notes",
        filename: "imported.md",
        content: noteMarkdown({ title: "导入测试", slug: "imported-note" }),
      }),
    });
    assert.equal(success.status, 200);
    assert.equal(success.payload.slug, "imported-note");
    assert.equal(
      fs.existsSync(path.join(repoRoot, ".local-content", "notes", "imported-note.md")),
      true,
    );

    const empty = await request("/api/import", {
      method: "POST",
      body: JSON.stringify({ kind: "notes", filename: "empty.md", content: "" }),
    });
    assert.equal(empty.status, 400);
    assert.match(empty.payload.error, /导入内容为空/);

    const dangerous = await request("/api/import", {
      method: "POST",
      body: JSON.stringify({
        kind: "notes",
        filename: "danger.md",
        content: "# 标题\n\n<script>alert(1)</script>",
      }),
    });
    assert.equal(dangerous.status, 422);
    assert.match(dangerous.payload.error, /原始 HTML/);
  });

  it("requires explicit confirmation before overwriting an import slug", async () => {
    const content = noteMarkdown({ title: "冲突测试", slug: "conflict-note" });
    const first = await request("/api/import", {
      method: "POST",
      body: JSON.stringify({ kind: "notes", filename: "conflict.md", content }),
    });
    assert.equal(first.status, 200);

    const conflict = await request("/api/import", {
      method: "POST",
      body: JSON.stringify({ kind: "notes", filename: "conflict.md", content }),
    });
    assert.equal(conflict.status, 409);
    assert.match(conflict.payload.error, /需要明确确认/);
    assert.equal(conflict.payload.slug, "conflict-note");

    const confirmed = await request("/api/import", {
      method: "POST",
      body: JSON.stringify({
        kind: "notes",
        filename: "conflict.md",
        content: content.replace("正文内容", "覆盖后的正文"),
        confirmOverwrite: true,
      }),
    });
    assert.equal(confirmed.status, 200);
    assert.equal(confirmed.payload.overwritten, true);
    assert.match(
      fs.readFileSync(path.join(repoRoot, ".local-content", "notes", "conflict-note.md"), "utf8"),
      /覆盖后的正文/,
    );

    const publishedFile = write(
      "content/site/notes/published-import.md",
      noteMarkdown({ title: "线上版本", slug: "published-import", body: "线上正文" }),
    );
    const localContent = noteMarkdown({
      title: "本机修改",
      slug: "published-import",
      body: "本机草稿正文",
    });
    const publishedConflict = await request("/api/import", {
      method: "POST",
      body: JSON.stringify({ kind: "notes", filename: "published.md", content: localContent }),
    });
    assert.equal(publishedConflict.status, 409);
    assert.equal(publishedConflict.payload.existsOnSite, true);

    const publishedConfirmed = await request("/api/import", {
      method: "POST",
      body: JSON.stringify({
        kind: "notes",
        filename: "published.md",
        content: localContent,
        confirmOverwrite: true,
      }),
    });
    assert.equal(publishedConfirmed.status, 200);
    assert.equal(publishedConfirmed.payload.hasPublishedCopy, true);
    assert.equal(publishedConfirmed.payload.overwritten, false);
    assert.match(fs.readFileSync(publishedFile, "utf8"), /线上正文/);
    assert.match(
      fs.readFileSync(path.join(repoRoot, ".local-content", "notes", "published-import.md"), "utf8"),
      /本机草稿正文/,
    );
  });

  it("creates a draft from a published note without losing metadata", async () => {
    const siteFile = write(
      "content/site/notes/published-preserve.md",
      noteMarkdown({
        title: "正式笔记",
        slug: "published-preserve",
        extra: [
          'summary: "正式摘要"',
          "tags:",
          '  - "topic/test"',
          'cover: "cover.webp"',
          'created: "2026-08-01"',
          'updated: "2026-08-29"',
          "pinned: true",
          'publish_at: "2026-09-01T10:30"',
        ].join("\n"),
      }),
    );

    const saved = await request("/api/drafts/notes/published-preserve", {
      method: "PUT",
      body: JSON.stringify({ body: "从正式稿建立的本机草稿" }),
    });
    assert.equal(saved.status, 200);
    assert.equal(fs.existsSync(siteFile), true);

    const draft = fs.readFileSync(
      path.join(repoRoot, ".local-content", "notes", "published-preserve.md"),
      "utf8",
    );
    assert.match(draft, /pinned: true/);
    assert.match(draft, /publish_at: "2026-09-01T10:30"/);
    assert.match(draft, /cover: "cover\.webp"/);
    assert.match(draft, /从正式稿建立的本机草稿/);
  });

  it("creates a draft from a published gallery without losing gallery metadata", async () => {
    write(
      "content/site/gallery/gallery-preserve.md",
      [
        "---",
        'title: "正式画廊"',
        'slug: "gallery-preserve"',
        'content_type: "gallery"',
        'status: "published"',
        'art_category: "illustration"',
        'series: "alpha"',
        "---",
        "",
        "画廊正文",
        "",
      ].join("\n"),
    );

    const saved = await request("/api/drafts/gallery/gallery-preserve", {
      method: "PUT",
      body: JSON.stringify({ body: "画廊本机草稿" }),
    });
    assert.equal(saved.status, 200);
    const draft = fs.readFileSync(
      path.join(repoRoot, ".local-content", "gallery", "gallery-preserve.md"),
      "utf8",
    );
    assert.match(draft, /art_category: "illustration"/);
    assert.match(draft, /series: "alpha"/);
  });

  it("rejects slug renames that collide with draft/site content or an online original", async () => {
    write(
      ".local-content/notes/rename-draft-source.md",
      noteMarkdown({ title: "草稿源", slug: "rename-draft-source" }),
    );
    write(
      ".local-content/notes/rename-draft-target.md",
      noteMarkdown({ title: "草稿目标", slug: "rename-draft-target" }),
    );
    const draftCollision = await request("/api/drafts/notes/rename-draft-source", {
      method: "PUT",
      body: JSON.stringify({ slug: "rename-draft-target" }),
    });
    assert.equal(draftCollision.status, 409);
    assert.match(draftCollision.payload.error, /其他草稿/);

    write(
      "content/site/notes/rename-site-target.md",
      noteMarkdown({ title: "正式目标", slug: "rename-site-target" }),
    );
    const siteCollision = await request("/api/drafts/notes/rename-draft-source", {
      method: "PUT",
      body: JSON.stringify({ slug: "rename-site-target" }),
    });
    assert.equal(siteCollision.status, 409);
    assert.match(siteCollision.payload.error, /正式内容/);

    write(
      "content/site/notes/rename-online-source.md",
      noteMarkdown({ title: "在线源", slug: "rename-online-source" }),
    );
    write(
      ".local-content/notes/rename-online-source.md",
      noteMarkdown({ title: "在线源草稿", slug: "rename-online-source" }),
    );
    const onlineSource = await request("/api/drafts/notes/rename-online-source", {
      method: "PUT",
      body: JSON.stringify({ slug: "rename-online-new" }),
    });
    assert.equal(onlineSource.status, 409);
    assert.match(onlineSource.payload.error, /先下线/);
  });

  it("rejects permanent draft deletion while a site copy still exists", async () => {
    const draft = noteMarkdown({ title: "不可删除", slug: "delete-protected" });
    write(".local-content/notes/delete-protected.md", draft);
    write("content/site/notes/delete-protected.md", draft);

    const deleted = await request("/api/drafts/notes/delete-protected", {
      method: "DELETE",
      body: JSON.stringify({ confirmTitle: "不可删除" }),
    });
    assert.equal(deleted.status, 409);
    assert.match(deleted.payload.error, /先下线/);
    assert.equal(
      fs.existsSync(path.join(repoRoot, ".local-content", "notes", "delete-protected.md")),
      true,
    );
    assert.equal(
      fs.existsSync(path.join(repoRoot, "content", "site", "notes", "delete-protected.md")),
      true,
    );
  });

  it("keeps autosaves out of history while explicit saves create a snapshot", async () => {
    write(
      ".local-content/notes/history-policy.md",
      noteMarkdown({ title: "历史策略", slug: "history-policy", body: "初始正文" }),
    );

    const autosaved = await request("/api/drafts/notes/history-policy", {
      method: "PUT",
      body: JSON.stringify({ body: "自动保存正文", snapshot: false }),
    });
    assert.equal(autosaved.status, 200);
    const historyDir = path.join(repoRoot, ".local-content", "history", "notes", "history-policy");
    assert.equal(fs.existsSync(historyDir), false);

    const explicitlySaved = await request("/api/drafts/notes/history-policy", {
      method: "PUT",
      body: JSON.stringify({ body: "手动保存正文", snapshot: true }),
    });
    assert.equal(explicitlySaved.status, 200);
    assert.equal(fs.readdirSync(historyDir).filter((name) => name.endsWith(".md")).length, 1);
  });
});
