import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { after, before, describe, it } from "node:test";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

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
  assert.equal(health.payload.ok, true);
  assert.equal(health.payload.process.ok, true);
  assert.equal(health.payload.scheduler.ok, true);
  assert.equal(typeof health.payload.ready, "boolean");
  const scheduler = await request("/api/scheduler/status");
  assert.equal(scheduler.status, 200);
  assert.deepEqual(scheduler.payload.summary, {
    pending: 0,
    overdue: 0,
    failed: 0,
    invalid: 0,
    published: 0,
  });
});

after(async () => {
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill();
    await once(serverProcess, "exit");
  }
  fs.rmSync(fixtureHome, { recursive: true, force: true });
});

describe("Studio API", () => {
  it("accepts real images only, enforces byte/pixel limits, and safely renames duplicates", async () => {
    const fake = await request("/api/assets?name=fake.png", {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: Buffer.from("not a PNG"),
    });
    assert.equal(fake.status, 415);
    assert.match(fake.payload.error, /有效的支持格式图片/);
    assert.equal(fs.existsSync(path.join(repoRoot, ".local-content", "assets", "fake.png")), false);

    const uploaded = await request("/api/assets?name=photo.jpg", {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: ONE_PIXEL_PNG,
    });
    assert.equal(uploaded.status, 200, uploaded.payload.error);
    assert.equal(uploaded.payload.name, "photo.webp");
    assert.equal(uploaded.payload.converted, true);
    assert.ok(fs.existsSync(path.join(repoRoot, ".local-content", "assets", "photo.webp")));

    const duplicate = await request("/api/assets?name=photo.png", {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: ONE_PIXEL_PNG,
    });
    assert.equal(duplicate.status, 200, duplicate.payload.error);
    assert.equal(duplicate.payload.name, "photo-2.webp");
    assert.equal(duplicate.payload.renamed, true);

    const oversized = await request("/api/assets?name=oversized.png", {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: Buffer.alloc(8 * 1024 * 1024 + 1),
    });
    assert.equal(oversized.status, 413);
    assert.match(oversized.payload.error, /8MB/);

    const tooManyPixels = await sharp({
      create: { width: 6500, height: 6500, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    const pixelLimit = await request("/api/assets?name=huge.png", {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: tooManyPixels,
    });
    assert.equal(pixelLimit.status, 413);
    assert.match(pixelLimit.payload.error, /像素超过上限/);
  });

  it("reports unresolved relative Markdown images while skipping external URLs", async () => {
    write(".local-content/assets/existing.png", "bound asset");
    const imported = await request("/api/import", {
      method: "POST",
      body: JSON.stringify({
        kind: "notes",
        filename: "assets-import.md",
        content: noteMarkdown({
          title: "图片引用导入",
          slug: "assets-import",
          body: [
            "![相对图片](images/missing.png)",
            "![缺失资产](assets/missing.png)",
            "![已有资产](assets/existing.png)",
            "![外链](https://example.com/image.png)",
          ].join("\n\n"),
        }),
      }),
    });
    assert.equal(imported.status, 200, imported.payload.error);
    assert.deepEqual(imported.payload.unresolvedAssets.sort(), [
      "assets/missing.png",
      "images/missing.png",
    ]);
  });

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

  it("previews orphan assets and rechecks both draft and site references before exact deletion", async () => {
    const draftAssets = path.join(repoRoot, ".local-content", "assets");
    const siteAssets = path.join(repoRoot, "content", "site", "assets");
    write(".local-content/assets/cleanup-draft-used.png", "draft used");
    write(".local-content/assets/cleanup-root-used.png", "root used");
    write(".local-content/assets/cleanup-dot-used.png", "dot used");
    write(".local-content/assets/cleanup-draft-orphan.png", "draft orphan");
    write(".local-content/assets/cleanup-external.png", "external only");
    write("content/site/assets/cleanup-site-used.png", "site used");
    write("content/site/assets/cleanup-site-orphan.png", "site orphan");
    write(
      ".local-content/notes/cleanup-draft-reference.md",
      noteMarkdown({
        title: "草稿引用资产",
        slug: "cleanup-draft-reference",
        body: [
          "![草稿图](assets/cleanup-draft-used.png)",
          "![根路径图](/assets/cleanup-root-used.png?version=1)",
          "![相对根路径图](./assets/cleanup-dot-used.png)",
        ].join("\n\n"),
      }),
    );
    write(
      "content/site/gallery/cleanup-site-reference.md",
      [
        "---",
        'title: "正式稿引用资产"',
        'slug: "cleanup-site-reference"',
        'content_type: "gallery"',
        'status: "published"',
        'cover: "assets/cleanup-site-used.png"',
        "---",
        "",
        "正式稿正文",
        "",
      ].join("\n"),
    );
    write(
      ".local-content/notes/cleanup-external-reference.md",
      noteMarkdown({
        title: "外链不绑定本地资产",
        slug: "cleanup-external-reference",
        body: "![外链](https://example.com/cleanup-external.png)",
      }),
    );

    const preview = await request("/api/assets/cleanup");
    assert.equal(preview.status, 200);
    const assets = preview.payload.assets;
    const findAsset = (name, source) => assets.find((asset) => asset.name === name && asset.source === source);
    assert.equal(findAsset("cleanup-draft-used.png", "draft"), undefined);
    assert.equal(findAsset("cleanup-root-used.png", "draft"), undefined);
    assert.equal(findAsset("cleanup-dot-used.png", "draft"), undefined);
    assert.equal(findAsset("cleanup-site-used.png", "site"), undefined);
    assert.equal(findAsset("cleanup-draft-orphan.png", "draft").size, Buffer.byteLength("draft orphan"));
    assert.equal(findAsset("cleanup-site-orphan.png", "site").size, Buffer.byteLength("site orphan"));
    assert.ok(findAsset("cleanup-external.png", "draft"));

    const noConfirmation = await request("/api/assets/cleanup", {
      method: "POST",
      body: JSON.stringify({ name: "cleanup-draft-orphan.png", source: "draft" }),
    });
    assert.equal(noConfirmation.status, 400);
    assert.match(noConfirmation.payload.error, /完全匹配/);

    const wrongConfirmation = await request("/api/assets/cleanup", {
      method: "POST",
      body: JSON.stringify({
        name: "cleanup-draft-orphan.png",
        source: "draft",
        confirmName: "cleanup-site-orphan.png",
      }),
    });
    assert.equal(wrongConfirmation.status, 400);

    const traversal = await request("/api/assets/cleanup", {
      method: "POST",
      body: JSON.stringify({ name: "../cleanup-draft-orphan.png", source: "draft", confirmName: "../cleanup-draft-orphan.png" }),
    });
    assert.equal(traversal.status, 400);
    assert.equal(fs.existsSync(path.join(draftAssets, "cleanup-draft-orphan.png")), true);

    const draftProtected = await request("/api/assets/cleanup", {
      method: "POST",
      body: JSON.stringify({
        name: "cleanup-draft-used.png",
        source: "draft",
        confirmName: "cleanup-draft-used.png",
      }),
    });
    assert.equal(draftProtected.status, 409);
    assert.equal(fs.existsSync(path.join(draftAssets, "cleanup-draft-used.png")), true);

    const siteProtected = await request("/api/assets/cleanup", {
      method: "POST",
      body: JSON.stringify({
        name: "cleanup-site-used.png",
        source: "site",
        confirmName: "cleanup-site-used.png",
      }),
    });
    assert.equal(siteProtected.status, 409);
    assert.equal(fs.existsSync(path.join(siteAssets, "cleanup-site-used.png")), true);

    write(".local-content/assets/cleanup-race.png", "race");
    const racePreview = await request("/api/assets/cleanup");
    assert.ok(racePreview.payload.assets.some((asset) => asset.name === "cleanup-race.png" && asset.source === "draft"));
    write(
      ".local-content/notes/cleanup-race-reference.md",
      noteMarkdown({
        title: "竞态引用",
        slug: "cleanup-race-reference",
        body: "![竞态](assets/cleanup-race.png)",
      }),
    );
    const raceDelete = await request("/api/assets/cleanup", {
      method: "POST",
      body: JSON.stringify({ name: "cleanup-race.png", source: "draft", confirmName: "cleanup-race.png" }),
    });
    assert.equal(raceDelete.status, 409);
    assert.equal(fs.existsSync(path.join(draftAssets, "cleanup-race.png")), true);

    const deletedDraft = await request("/api/assets/cleanup", {
      method: "POST",
      body: JSON.stringify({
        name: "cleanup-draft-orphan.png",
        source: "draft",
        confirmName: "cleanup-draft-orphan.png",
      }),
    });
    assert.deepEqual(deletedDraft.payload, {
      ok: true,
      name: "cleanup-draft-orphan.png",
      source: "draft",
      deleted: true,
    });
    assert.equal(deletedDraft.status, 200);
    assert.equal(fs.existsSync(path.join(draftAssets, "cleanup-draft-orphan.png")), false);
    assert.equal(fs.existsSync(path.join(siteAssets, "cleanup-site-orphan.png")), true);

    const deletedSite = await request("/api/assets/cleanup", {
      method: "POST",
      body: JSON.stringify({
        name: "cleanup-site-orphan.png",
        source: "site",
        confirmName: "cleanup-site-orphan.png",
      }),
    });
    assert.equal(deletedSite.status, 200);
    assert.equal(fs.existsSync(path.join(siteAssets, "cleanup-site-orphan.png")), false);
  });
});
