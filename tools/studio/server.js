import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import {
  KIND_IDS,
  extractSummary,
  extractTitle,
  nowIsoDate,
  parseFrontmatter,
  sanitizeFileName,
  serializeFrontmatter,
  slugify,
} from "./lib.js";
import { isBusy, publishDraft } from "./publish.js";
import { isBusy as isUnpublishBusy, unpublishToDraft } from "./unpublish.js";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, "..", "..");
const localRoot = path.join(repoRoot, ".local-content");
const siteRoot = path.join(repoRoot, "content", "site");
const publicDir = path.join(toolDir, "public");

const HOST = "127.0.0.1";
const PORT = Number(process.env.STUDIO_PORT ?? 4319);
const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "localhost", "[::1]"]);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function kindDir(kind, layer) {
  const base = layer === "draft" ? localRoot : siteRoot;
  return path.join(base, kind);
}

function draftPath(kind, slug) {
  return path.join(kindDir(kind, "draft"), `${slug}.md`);
}

function sitePath(kind, slug) {
  return path.join(kindDir(kind, "site"), `${slug}.md`);
}

function fileExists(file) {
  return fs.existsSync(file);
}

function readDocument(file) {
  const parsed = parseFrontmatter(fs.readFileSync(file, "utf8"));
  return {
    title: typeof parsed.frontmatter.title === "string" ? parsed.frontmatter.title : "",
    slug: typeof parsed.frontmatter.slug === "string" ? parsed.frontmatter.slug : "",
    contentType:
      typeof parsed.frontmatter.content_type === "string" ? parsed.frontmatter.content_type : "",
    status: typeof parsed.frontmatter.status === "string" ? parsed.frontmatter.status : "",
    summary: typeof parsed.frontmatter.summary === "string" ? parsed.frontmatter.summary : "",
    tags: Array.isArray(parsed.frontmatter.tags)
      ? parsed.frontmatter.tags.filter((tag) => typeof tag === "string")
      : [],
    cover: typeof parsed.frontmatter.cover === "string" ? parsed.frontmatter.cover : null,
    pinned: parsed.frontmatter.pinned === true,
    artCategory:
      typeof parsed.frontmatter.art_category === "string" ? parsed.frontmatter.art_category : "",
    series: typeof parsed.frontmatter.series === "string" ? parsed.frontmatter.series : "",
    created: typeof parsed.frontmatter.created === "string" ? parsed.frontmatter.created : null,
    updated: typeof parsed.frontmatter.updated === "string" ? parsed.frontmatter.updated : null,
    body: parsed.body.replace(/^\n+/, ""),
  };
}

function listMarkdownSlugs(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.slice(0, -3));
}

function historyDir(kind, slug) {
  return path.join(localRoot, "history", kind, slug);
}

const MAX_VERSIONS = 20;

// Snapshot the current draft before an explicit overwrite; autosaves pass
// snapshot:false and never pollute history.
function snapshotDraft(kind, slug) {
  const file = draftPath(kind, slug);
  if (!fs.existsSync(file)) {
    return;
  }
  const dir = historyDir(kind, slug);
  ensureDir(dir);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.copyFileSync(file, path.join(dir, `${stamp}.md`));

  const versions = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort();
  while (versions.length > MAX_VERSIONS) {
    fs.rmSync(path.join(dir, versions.shift()));
  }
}

function listVersions(kind, slug) {
  const dir = historyDir(kind, slug);
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse()
    .map((f) => {
      const stat = fs.statSync(path.join(dir, f));
      return { id: f.slice(0, -3), savedAt: stat.mtime.toISOString(), bytes: stat.size };
    });
}

function uniqueSlug(kind, wanted) {
  const taken = new Set([
    ...listMarkdownSlugs(kindDir(kind, "draft")),
    ...listMarkdownSlugs(kindDir(kind, "site")),
  ]);
  if (!taken.has(wanted)) {
    return wanted;
  }
  let index = 2;
  while (taken.has(`${wanted}-${index}`)) {
    index += 1;
  }
  return `${wanted}-${index}`;
}

function collectItems() {
  const items = [];

  for (const kind of KIND_IDS) {
    const published = new Set(listMarkdownSlugs(kindDir(kind, "site")));

    for (const slug of listMarkdownSlugs(kindDir(kind, "draft"))) {
      const doc = readDocument(draftPath(kind, slug));
      items.push({
        kind,
        slug,
        title: doc.title,
        summary: doc.summary,
        tags: doc.tags,
        cover: doc.cover,
        updated: doc.updated,
        status: published.has(slug) ? "published" : "draft",
        hasLocalDraft: true,
      });
    }

    for (const slug of published) {
      if (items.some((item) => item.kind === kind && item.slug === slug)) {
        continue;
      }
      const doc = readDocument(sitePath(kind, slug));
      items.push({
        kind,
        slug,
        title: doc.title,
        summary: doc.summary,
        tags: doc.tags,
        cover: doc.cover,
        updated: doc.updated,
        artCategory: doc.artCategory,
        series: doc.series,
        status: "published",
        hasLocalDraft: false,
      });
    }
  }

  return items;
}

function assetReferencesIn(body) {
  const references = new Set();
  const patterns = [/\((?:assets\/)?([^)\s]+\.[A-Za-z0-9]+)\)/g, /cover:\s*"?([^"\n]+)"?/g];
  for (const pattern of patterns) {
    for (const match of String(body ?? "").matchAll(pattern)) {
      if (match[1]) {
        references.add(path.basename(match[1]));
      }
    }
  }
  return references;
}

function isLocalOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) {
    return true;
  }
  try {
    return LOCAL_HOSTNAMES.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sendError(res, status, message, extra = {}) {
  sendJson(res, status, { error: message, ...extra });
}

function readBody(req, limit = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJsonBody(req) {
  const raw = await readBody(req);
  if (raw.length === 0) {
    return {};
  }
  try {
    return JSON.parse(raw.toString("utf8"));
  } catch {
    throw new Error("invalid JSON body");
  }
}

function serveStatic(res, filePath, contentType) {
  if (!fs.existsSync(filePath)) {
    sendError(res, 404, "not found");
    return;
  }
  res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store" });
  res.end(fs.readFileSync(filePath));
}

function serveAsset(res, baseDir, fileName) {
  const safe = sanitizeFileName(fileName);
  const file = path.join(baseDir, safe);
  if (!file.startsWith(baseDir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    sendError(res, 404, "asset not found");
    return;
  }
  res.writeHead(200, { "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(res);
}

function markedBundlePath() {
  const candidates = [
    path.join(toolDir, "node_modules", "marked", "marked.min.js"),
    path.join(toolDir, "node_modules", "marked", "lib", "marked.umd.js"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function createDraft(kind, body) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const defaultTitle = kind === "gallery" ? "未命名作品" : "未命名笔记";
  const finalTitle = title || defaultTitle;
  const slug = uniqueSlug(kind, slugify(title || finalTitle, kind === "gallery" ? "art" : "note"));
  const today = nowIsoDate();

  ensureDir(kindDir(kind, "draft"));
  const file = draftPath(kind, slug);
  const markdown = serializeFrontmatter(
    {
      title: finalTitle,
      slug,
      content_type: kind === "gallery" ? "gallery" : "note",
      status: "draft",
      created: today,
      updated: today,
    },
    "",
  );
  fs.writeFileSync(file, markdown, "utf8");
  return { kind, slug };
}

async function importDraft(kind, body, res) {
  const content = typeof body.content === "string" ? body.content : "";
  if (!content.trim()) {
    sendError(res, 400, "导入内容为空");
    return;
  }

  const rawHtmlPatterns = [
    /<script[\s>]/i,
    /<iframe[\s>]/i,
    /<style[\s>]/i,
    /\son\w+\s*=\s*["']?/i,
    /javascript\s*:/i,
  ];
  const hit = rawHtmlPatterns.find((pattern) => pattern.test(content));
  if (hit) {
    sendError(
      res,
      422,
      "内容包含不受支持的原始 HTML（如 <script>、内联事件）。本站只渲染标准 Markdown，请移除 HTML 后重新导入。",
    );
    return;
  }

  const parsed = parseFrontmatter(content);
  const frontTitle =
    typeof parsed.frontmatter.title === "string" ? parsed.frontmatter.title.trim() : "";
  const headingTitle = extractTitle(parsed.body);
  const fileNameBase = sanitizeFileName(
    typeof body.filename === "string" ? body.filename.replace(/\.md$/i, "") : "",
  ).replace(/\.md$/i, "");
  const title = frontTitle || headingTitle || fileNameBase || "导入草稿";

  const wantedSlug = slugify(
    typeof parsed.frontmatter.slug === "string" && parsed.frontmatter.slug.trim()
      ? parsed.frontmatter.slug
      : frontTitle || headingTitle || fileNameBase,
    "import",
  );

  const existsDraft = fileExists(draftPath(kind, wantedSlug));
  const existsSite = fileExists(sitePath(kind, wantedSlug));
  if ((existsDraft || existsSite) && body.confirmOverwrite !== true) {
    sendError(res, 409, "已存在同 slug 内容，需要明确确认才能覆盖", {
      slug: wantedSlug,
      existsInDraft: existsDraft,
      existsOnSite: existsSite,
    });
    return;
  }

  const slug = body.confirmOverwrite === true ? wantedSlug : uniqueSlug(kind, wantedSlug);
  const today = nowIsoDate();
    const summary =
      typeof doc.frontmatter.summary === "string"
        ? doc.frontmatter.summary
        : extractSummary(parsed.body);
    const tags = Array.isArray(parsed.frontmatter.tags)
      ? parsed.frontmatter.tags.filter((tag) => typeof tag === "string")
      : [];
    const cover = typeof parsed.frontmatter.cover === "string" ? parsed.frontmatter.cover : null;

    ensureDir(kindDir(kind, "draft"));
    const markdown = serializeFrontmatter(
      {
        title,
        slug,
        content_type: kind === "gallery" ? "gallery" : "note",
        status: "draft",
        summary,
        tags,
        cover,
        created:
          typeof parsed.frontmatter.created === "string" ? parsed.frontmatter.created : today,
        updated:
          typeof parsed.frontmatter.updated === "string" ? parsed.frontmatter.updated : today,
        ...(kind === "gallery"
          ? {
              art_category:
                typeof parsed.frontmatter.art_category === "string"
                  ? parsed.frontmatter.art_category
                  : "",
              series:
                typeof parsed.frontmatter.series === "string" ? parsed.frontmatter.series : "",
            }
          : {}),
      },
      parsed.body,
    );
  fs.writeFileSync(draftPath(kind, slug), markdown, "utf8");

  sendJson(res, 200, {
    kind,
    slug,
    overwritten: existsDraft || existsSite,
    replacedSiteCopy: existsSite,
  });
}

async function saveDraft(kind, slug, body, res) {
  let file = draftPath(kind, slug);
  if (!fileExists(file)) {
    const published = sitePath(kind, slug);
    if (!fileExists(published)) {
      sendError(res, 404, "草稿不存在");
      return;
    }
    // Editing published content starts a local draft copy, matching the
    // spec rule that the site copy is the maintenance source only after
    // an explicit unpublish.
    const siteDoc = readDocument(published);
    ensureDir(kindDir(kind, "draft"));
    fs.writeFileSync(
      file,
      serializeFrontmatter(
        {
          title: siteDoc.title,
          slug: siteDoc.slug,
          content_type: kind === "gallery" ? "gallery" : "note",
          status: "draft",
          summary: siteDoc.summary,
          tags: siteDoc.tags,
          cover: siteDoc.cover,
          created: siteDoc.created ?? nowIsoDate(),
          updated: nowIsoDate(),
        },
        siteDoc.body,
      ),
      "utf8",
    );
  }

  const doc = readDocument(file);
  if (body.snapshot !== false) {
    snapshotDraft(kind, slug);
  }
  const nextBody = typeof body.body === "string" ? body.body : doc.body;
  const extract = body.extractMeta !== false;

  let title = typeof body.title === "string" ? body.title.trim() : doc.title;
  if (!title && extract) {
    title = extractTitle(nextBody) ?? doc.title;
  }

  let summary = typeof body.summary === "string" ? body.summary.trim() : doc.summary;
  if (!summary && extract) {
    summary = extractSummary(nextBody);
  }

  let nextSlug = slug;
  if (typeof body.slug === "string" && body.slug.trim() && body.slug.trim() !== slug) {
    nextSlug = slugify(body.slug, slug);
    if (nextSlug !== slug && fileExists(draftPath(kind, nextSlug))) {
      sendError(res, 409, `slug "${nextSlug}" 已被其他草稿使用`);
      return;
    }
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((tag) => typeof tag === "string" && tag.trim()).map((tag) => tag.trim())
    : doc.tags;
  const cover = typeof body.cover === "string" && body.cover.trim() ? body.cover.trim() : null;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const created = datePattern.test(body.created ?? "") ? body.created : (doc.created ?? nowIsoDate());
  const updated = datePattern.test(body.updated ?? "") ? body.updated : nowIsoDate();
  const pinned = typeof body.pinned === "boolean" ? body.pinned : doc.pinned;
  const artCategory =
    kind === "gallery" && typeof body.artCategory === "string" ? body.artCategory.trim() : doc.artCategory ?? "";
  const series =
    kind === "gallery" && typeof body.series === "string" ? body.series.trim() : doc.series ?? "";

  const markdown = serializeFrontmatter(
    {
      title,
      slug: nextSlug,
      content_type: kind === "gallery" ? "gallery" : "note",
      status: "draft",
      summary,
      tags,
      cover,
      created,
      updated,
      pinned: pinned || undefined,
      ...(kind === "gallery" ? { art_category: artCategory, series } : {}),
    },
    nextBody,
  );

  ensureDir(kindDir(kind, "draft"));
  const targetFile = draftPath(kind, nextSlug);
  fs.writeFileSync(targetFile, markdown, "utf8");
  if (targetFile !== file) {
    fs.rmSync(file);
    const oldHistory = historyDir(kind, slug);
    if (fs.existsSync(oldHistory)) {
      fs.mkdirSync(path.dirname(historyDir(kind, nextSlug)), { recursive: true });
      fs.renameSync(oldHistory, historyDir(kind, nextSlug));
    }
  }

  sendJson(res, 200, { kind, slug: nextSlug, renamed: nextSlug !== slug });
}

function deleteDraft(kind, slug, body, res) {
  const file = draftPath(kind, slug);
  if (!fileExists(file)) {
    sendError(res, 404, "草稿不存在（正式内容请先下线）");
    return;
  }

  const doc = readDocument(file);
  if (!body.confirmTitle || body.confirmTitle !== doc.title) {
    sendError(res, 400, "确认标题不匹配，未删除", { expectedTitle: doc.title });
    return;
  }

  const references = new Set();
  if (doc.cover) {
    references.add(path.basename(doc.cover));
  }
  for (const ref of assetReferencesIn(doc.body)) {
    references.add(ref);
  }

  fs.rmSync(file);
  const draftHistory = historyDir(kind, slug);
  if (fs.existsSync(draftHistory)) {
    fs.rmSync(draftHistory, { recursive: true, force: true });
  }

  for (const otherKind of KIND_IDS) {
    for (const otherSlug of listMarkdownSlugs(kindDir(otherKind, "draft"))) {
      if (otherKind === kind && otherSlug === slug) {
        continue;
      }
      const other = readDocument(draftPath(otherKind, otherSlug));
      if (other.cover) {
        references.delete(path.basename(other.cover));
      }
      for (const ref of assetReferencesIn(other.body)) {
        references.delete(ref);
      }
    }
    for (const otherSlug of listMarkdownSlugs(kindDir(otherKind, "site"))) {
      const other = readDocument(sitePath(otherKind, otherSlug));
      if (other.cover) {
        references.delete(path.basename(other.cover));
      }
      for (const ref of assetReferencesIn(other.body)) {
        references.delete(ref);
      }
    }
  }

  const assetsDir = path.join(localRoot, "assets");
  let removedAssets = 0;
  if (fs.existsSync(assetsDir)) {
    for (const name of references) {
      const assetFile = path.join(assetsDir, name);
      if (fs.existsSync(assetFile)) {
        fs.rmSync(assetFile);
        removedAssets += 1;
      }
    }
  }

  sendJson(res, 200, { kind, slug, removedAssets });
}

async function handleApi(req, res, url) {
  const { pathname } = url;
  const method = req.method ?? "GET";

  if (method !== "GET" && !isLocalOrigin(req)) {
    sendError(res, 403, "跨域写入被拒绝：仅允许本机来源");
    return;
  }

  if (method === "GET" && pathname === "/api/items") {
    sendJson(res, 200, { items: collectItems() });
    return;
  }

  if (method === "GET" && pathname === "/api/deploy-status") {
    // Deployment echo: ask the Vercel CLI (already authenticated on this
    // machine) for the latest production deployment of the linked project.
    const listing = spawnSync(
      "npx",
      [
        "--yes",
        "vercel@latest",
        "ls",
        "personal-site",
        "--json",
        "--scope",
        "guyongs-projects-f59a7a4c",
      ],
      { encoding: "utf8", shell: process.platform === "win32", timeout: 90000 },
    );
    const output = `${listing.stdout ?? ""}${listing.stderr ?? ""}`;
    const jsonStart = output.indexOf("[");
    const jsonEnd = output.lastIndexOf("]");
    if (jsonStart === -1 || jsonEnd <= jsonStart) {
      sendError(res, 502, `查询部署状态失败：${output.slice(0, 200) || "vercel 无输出"}`);
      return;
    }
    try {
      const deployments = JSON.parse(output.slice(jsonStart, jsonEnd + 1));
      const production = deployments.find((entry) => entry.target === "production") ?? deployments[0];
      if (!production) {
        sendError(res, 404, "没有查询到部署记录");
        return;
      }
      sendJson(res, 200, {
        state: production.state ?? production.readyState ?? "UNKNOWN",
        url: production.url ? `https://${production.url}` : null,
        created: production.created ?? null,
      });
    } catch (error) {
      sendError(res, 502, `解析部署状态失败：${error.message}`);
    }
    return;
  }

  if (method === "GET" && pathname === "/api/assets") {
    const assets = [];
    const draftDir = path.join(localRoot, "assets");
    const siteDir = path.join(siteRoot, "assets");
    for (const name of fs.existsSync(draftDir) ? fs.readdirSync(draftDir) : []) {
      if (name !== ".gitkeep") {
        assets.push({ name, source: "draft" });
      }
    }
    for (const name of fs.existsSync(siteDir) ? fs.readdirSync(siteDir) : []) {
      if (name !== ".gitkeep" && !assets.some((asset) => asset.name === name)) {
        assets.push({ name, source: "site" });
      }
    }
    sendJson(res, 200, { assets });
    return;
  }

  if (method === "POST" && pathname === "/api/drafts") {
    const body = await readJsonBody(req);
    if (!KIND_IDS.includes(body.kind)) {
      sendError(res, 400, "kind 必须是 notes 或 gallery");
      return;
    }
    sendJson(res, 200, createDraft(body.kind, body));
    return;
  }

  if (method === "POST" && pathname === "/api/import") {
    const body = await readJsonBody(req);
    if (!KIND_IDS.includes(body.kind)) {
      sendError(res, 400, "kind 必须是 notes 或 gallery");
      return;
    }
    await importDraft(body.kind, body, res);
    return;
  }

    if (method === "POST" && pathname === "/api/assets") {
    const name = sanitizeFileName(url.searchParams.get("name") ?? "");
    if (!name) {
      sendError(res, 400, "缺少 name 参数");
      return;
    }
    const dir = path.join(localRoot, "assets");
    ensureDir(dir);
    const buffer = await readBody(req);
    if (buffer.length === 0) {
      sendError(res, 400, "资产内容为空");
      return;
    }

    // Images (jpg/png) are downsized to a 1600px cap and re-encoded as webp;
    // other files pass through untouched. Encoding failures fall back to the
    // original bytes.
    let finalBuffer = buffer;
    let finalName = name;
    if (/\.(jpe?g|png)$/i.test(finalName)) {
      try {
        finalBuffer = await sharp(buffer)
          .resize({ width: 1600, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        finalName = finalName.replace(/\.(jpe?g|png)$/i, ".webp");
      } catch {
        finalBuffer = buffer;
      }
    }

    // Duplicate uploads auto-rename (stem-2.ext, stem-3.ext, …) so an
    // existing asset is never silently overwritten.
    const ext = path.extname(finalName);
    const stem = ext ? finalName.slice(0, finalName.length - ext.length) : finalName;
    let index = 2;
    while (fs.existsSync(path.join(dir, finalName))) {
      finalName = `${stem}-${index}${ext}`;
      index += 1;
    }
    fs.writeFileSync(path.join(dir, finalName), finalBuffer);
    sendJson(res, 200, { name: finalName, source: "draft", renamed: finalName !== name });
    return;
  }

  const draftMatch = pathname.match(/^\/api\/drafts\/(notes|gallery)\/([a-z0-9][a-z0-9-]*)$/);
  if (draftMatch) {
    const [, kind, slug] = draftMatch;

    if (method === "GET") {
      const file = draftPath(kind, slug);
      if (fileExists(file)) {
        sendJson(res, 200, { ...readDocument(file), kind, source: "draft" });
        return;
      }
      const published = sitePath(kind, slug);
      if (fileExists(published)) {
        sendJson(res, 200, { ...readDocument(published), kind, source: "site" });
        return;
      }
      sendError(res, 404, "草稿不存在");
      return;
    }

    if (method === "PUT") {
      const body = await readJsonBody(req);
      await saveDraft(kind, slug, body, res);
      return;
    }

    if (method === "DELETE") {
      const body = await readJsonBody(req);
      deleteDraft(kind, slug, body, res);
      return;
    }
  }

  const versionsMatch = pathname.match(/^\/api\/versions\/(notes|gallery)\/([a-z0-9][a-z0-9-]*)$/);
  if (versionsMatch && method === "GET") {
    const [, kind, slug] = versionsMatch;
    sendJson(res, 200, { versions: listVersions(kind, slug) });
    return;
  }

  const restoreMatch = pathname.match(
    /^\/api\/versions\/(notes|gallery)\/([a-z0-9][a-z0-9-]*)\/([0-9A-Z-]+)\/restore$/,
  );
  if (restoreMatch && method === "POST") {
    const [, kind, slug, versionId] = restoreMatch;
    const snapshotFile = path.join(historyDir(kind, slug), `${versionId}.md`);
    if (!fs.existsSync(snapshotFile)) {
      sendError(res, 404, "版本不存在");
      return;
    }
    if (!fileExists(draftPath(kind, slug))) {
      sendError(res, 404, "草稿不存在，无法恢复");
      return;
    }
    snapshotDraft(kind, slug);
    fs.copyFileSync(snapshotFile, draftPath(kind, slug));
    sendJson(res, 200, { kind, slug, restoredTo: versionId });
    return;
  }

  const publishMatch = pathname.match(/^\/api\/publish\/(notes|gallery)\/([a-z0-9][a-z0-9-]*)$/);
  if (publishMatch && method === "POST") {
    if (isBusy()) {
      sendError(res, 409, "已有发布任务在进行中，请稍后再试");
      return;
    }
    const [, kind, slug] = publishMatch;
    // Runs the full validate → write → generate → check → commit → push
    // pipeline; the long blocking call is acceptable for a local single-user
    // tool and the client shows the spinner until the JSON verdict arrives.
    const result = publishDraft(kind, slug);
    sendJson(res, result.ok ? 200 : 422, result);
    return;
  }

  const unpublishMatch = pathname.match(/^\/api\/unpublish\/(notes|gallery)\/([a-z0-9][a-z0-9-]*)$/);
  if (unpublishMatch && method === "POST") {
    if (isUnpublishBusy()) {
      sendError(res, 409, "已有下线任务在进行中，请稍后再试");
      return;
    }
    const [, kind, slug] = unpublishMatch;
    const result = unpublishToDraft(kind, slug);
    sendJson(res, result.ok ? 200 : 422, result);
    return;
  }

  sendError(res, 404, "unknown API route");
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);

    if (url.pathname === "/healthz") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    if (url.pathname.startsWith("/asset/draft/")) {
      serveAsset(res, path.join(localRoot, "assets"), url.pathname.slice("/asset/draft/".length));
      return;
    }
    if (url.pathname.startsWith("/asset/site/")) {
      serveAsset(res, path.join(siteRoot, "assets"), url.pathname.slice("/asset/site/".length));
      return;
    }

    if (url.pathname === "/studio") {
      serveStatic(res, path.join(publicDir, "index.html"), "text/html; charset=utf-8");
      return;
    }
    if (url.pathname === "/studio/app.js") {
      serveStatic(res, path.join(publicDir, "app.js"), "text/javascript; charset=utf-8");
      return;
    }
    if (url.pathname === "/studio/style.css") {
      serveStatic(res, path.join(publicDir, "style.css"), "text/css; charset=utf-8");
      return;
    }
    if (url.pathname === "/studio/vendor/marked.js") {
      const bundle = markedBundlePath();
      if (!bundle) {
        sendError(res, 404, "marked bundle not installed");
        return;
      }
      serveStatic(res, bundle, "text/javascript; charset=utf-8");
      return;
    }

    sendError(res, 404, "not found");
  } catch (error) {
    sendError(res, 400, error.message ?? "bad request");
  }
});

ensureDir(path.join(localRoot, "notes"));
ensureDir(path.join(localRoot, "gallery"));
ensureDir(path.join(localRoot, "assets"));
ensureDir(path.join(siteRoot, "notes"));
ensureDir(path.join(siteRoot, "gallery"));
ensureDir(path.join(siteRoot, "assets"));

server.listen(PORT, HOST, () => {
  console.log(`studio listening on http://${HOST}:${PORT}/studio (local only)`);
});
