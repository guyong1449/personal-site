import fs from "node:fs";
import http from "node:http";
import path from "node:path";
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
    typeof parsed.frontmatter.summary === "string"
      ? parsed.frontmatter.summary
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

  const markdown = serializeFrontmatter(
    {
      title,
      slug: nextSlug,
      content_type: kind === "gallery" ? "gallery" : "note",
      status: "draft",
      summary,
      tags,
      cover,
      created: doc.created ?? nowIsoDate(),
      updated: nowIsoDate(),
    },
    nextBody,
  );

  ensureDir(kindDir(kind, "draft"));
  const targetFile = draftPath(kind, nextSlug);
  fs.writeFileSync(targetFile, markdown, "utf8");
  if (targetFile !== file) {
    fs.rmSync(file);
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
    fs.writeFileSync(path.join(dir, name), buffer);
    sendJson(res, 200, { name, source: "draft" });
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

  const actionMatch = pathname.match(/^\/api\/(publish|unpublish)\/(notes|gallery)\/([a-z0-9][a-z0-9-]*)$/);
  if (actionMatch && method === "POST") {
    const action = actionMatch[1];
    sendError(
      res,
      501,
      action === "publish" ? "发布流程在批次 6 接入" : "下线流程在批次 7 接入",
    );
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
