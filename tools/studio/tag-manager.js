import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { KIND_IDS, parseFrontmatter } from "./lib.js";
import { acquireOperationLock } from "./operation-lock.js";
import { publishPathsToGit, regeneratePublicSnapshot, rollbackCommit, runChecks } from "./publish.js";

const sortNames = (values) => [...new Set(values)].sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true, sensitivity: "base" }));
const catalogPath = (root) => path.join(root, "content/site/taxonomy.json");
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };

function validTag(value) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 80 || /\s/.test(value.trim())) {
    fail("标签应为 1–80 个字符，不能包含空格");
  }
  return value.trim();
}

function scanDocuments(root) {
  const records = [];
  for (const layer of ["content/site", ".local-content"]) {
    for (const kind of KIND_IDS) {
      const dir = path.join(root, layer, kind);
      if (!fs.existsSync(dir)) continue;
      for (const name of fs.readdirSync(dir).filter((name) => /^[a-z0-9][a-z0-9-]*\.md$/.test(name)).sort()) {
        const file = path.join(dir, name);
        const bytes = fs.readFileSync(file);
        const parsed = parseFrontmatter(bytes.toString("utf8"));
        records.push({ file, layer, kind, slug: name.slice(0, -3), bytes, parsed });
      }
    }
  }
  return records;
}

function readCatalog(root) {
  const file = catalogPath(root);
  if (!fs.existsSync(file)) return { topics: ["课程", "生活", "科研", "DKU"], tags: [] };
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(value.tags) || !Array.isArray(value.topics)) fail("标签库格式不正确");
  value.tags.forEach(validTag);
  return value;
}

export function readTagManager(root) {
  const catalog = readCatalog(root);
  const records = scanDocuments(root);
  const documents = new Map();
  const hash = crypto.createHash("sha256").update(JSON.stringify(catalog));
  for (const record of records) {
    hash.update(path.relative(root, record.file)).update(record.bytes);
    const key = `${record.kind}/${record.slug}`;
    const previous = documents.get(key);
    const tags = record.parsed.frontmatter.tags ?? [];
    if (!previous) documents.set(key, { kind: record.kind, slug: record.slug, title: record.parsed.frontmatter.title || record.slug, tags, published: record.layer === "content/site", hasDraft: record.layer === ".local-content" });
    else previous.hasDraft = true;
  }
  const tags = sortNames([...catalog.tags, ...records.flatMap((record) => record.parsed.frontmatter.tags ?? [])]);
  return { revision: hash.digest("hex"), tags, documents: [...documents.values()] };
}

// Replace only the tags field, keeping every other byte (including the body).
// Verify the parsed result before writing; unfamiliar YAML layouts fail closed.
export function replaceDocumentTags(source, tags) {
  const before = parseFrontmatter(source);
  const block = source.match(/^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!block) fail("文章缺少 frontmatter");
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const field = `tags:${newline}${tags.map((tag) => `  - ${JSON.stringify(tag)}`).join(newline)}`;
  const head = /^tags\s*:/m.test(block[1])
    ? block[1].replace(/^tags:[^\r\n]*(?:\r?\n[ \t]*-[^\r\n]*)*/m, field)
    : `${block[1]}${newline}${field}`;
  const headOffset = block[0].indexOf(block[1]);
  const next = source.slice(0, headOffset) + head + source.slice(headOffset + block[1].length);
  const after = parseFrontmatter(next);
  const withoutTags = ({ tags: ignored, ...rest }) => rest;
  if (JSON.stringify(after.frontmatter.tags) !== JSON.stringify(tags)
    || JSON.stringify(withoutTags(before.frontmatter)) !== JSON.stringify(withoutTags(after.frontmatter))
    || before.body !== after.body) fail("标签格式复杂，请先在文章编辑器保存，再修改标签");
  return next;
}

export function changeTags(root, input) {
  const lock = acquireOperationLock(root, "edit-tags");
  if (!lock.ok) fail(lock.message, 409);
  const saved = new Map();
  function write(file, content) {
    if (!saved.has(file)) saved.set(file, fs.existsSync(file) ? fs.readFileSync(file) : null);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  try {
    const current = readTagManager(root);
    if (input.revision !== current.revision) fail("标签或文章已更新，请刷新标签管理后重试", 409);
    const catalog = readCatalog(root);
    const records = scanDocuments(root);
    // Draft-only tags stay local until explicitly added/assigned by the owner.
    let tags = sortNames([...catalog.tags, ...records.filter((record) => record.layer === "content/site").flatMap((record) => record.parsed.frontmatter.tags ?? [])]);
    const updates = [];
    if (input.action === "create") {
      const name = validTag(input.name);
      if (tags.includes(name)) fail("标签已存在", 409);
      tags = [...tags, name];
    } else if (input.action === "rename") {
      const oldName = validTag(input.oldName);
      const name = validTag(input.name);
      if (!tags.includes(oldName)) fail("原标签不存在", 404);
      if (oldName !== name && tags.includes(name)) fail("目标标签已存在，请使用不同名称", 409);
      tags = [...tags.map((tag) => tag === oldName ? name : tag), name];
      for (const record of records) {
        const values = record.parsed.frontmatter.tags ?? [];
        if (values.includes(oldName)) updates.push([record.file, replaceDocumentTags(record.bytes.toString("utf8"), sortNames(values.map((tag) => tag === oldName ? name : tag)))]);
      }
    } else if (input.action === "assign") {
      if (!KIND_IDS.includes(input.kind) || !/^[a-z0-9][a-z0-9-]*$/.test(input.slug ?? "")) fail("文章标识不正确");
      if (!Array.isArray(input.tags) || input.tags.length === 0) fail("每篇文章至少保留一个标签");
      const values = sortNames(input.tags.map(validTag));
      const matches = records.filter((record) => record.kind === input.kind && record.slug === input.slug);
      if (matches.length === 0) fail("文章不存在", 404);
      for (const record of matches) updates.push([record.file, replaceDocumentTags(record.bytes.toString("utf8"), values)]);
      tags = [...tags, ...values];
    } else fail("不支持的标签操作");
    for (const [file, content] of updates) write(file, content);
    write(catalogPath(root), `${JSON.stringify({ ...catalog, tags: sortNames(tags) }, null, 2)}\n`);
    const generated = regeneratePublicSnapshot();
    if (!generated.ok) fail(generated.message, 422);
    return readTagManager(root);
  } catch (error) {
    for (const [file, bytes] of saved) {
      if (bytes === null) fs.rmSync(file, { force: true });
      else fs.writeFileSync(file, bytes);
    }
    if (saved.size > 0) regeneratePublicSnapshot();
    throw error;
  } finally { lock.release(); }
}

export function publishTagChanges(root, revision) {
  const lock = acquireOperationLock(root, "publish-tags");
  if (!lock.ok) return { ok: false, message: lock.message };
  const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true, timeout: 15000 }).trim();
  try {
    if (revision !== readTagManager(root).revision) fail("标签或文章已更新，请刷新后再发布", 409);
    const changed = [...new Set([
      ...git(["diff", "--name-only", "HEAD", "--", "content/site"]).split("\n"),
      ...git(["ls-files", "--others", "--exclude-standard", "--", "content/site"]).split("\n"),
    ].filter(Boolean))];
    if (changed.length === 0) return { ok: false, message: "没有待发布的标签改动" };
    for (const file of changed) {
      if (file === "content/site/taxonomy.json") continue;
      if (!/^content\/site\/(notes|gallery)\/[a-z0-9][a-z0-9-]*\.md$/.test(file)) fail("存在其他内容改动，请先通过文章发布处理");
      const before = parseFrontmatter(git(["show", `HEAD:${file}`]));
      const after = parseFrontmatter(fs.readFileSync(path.join(root, file), "utf8"));
      const withoutTags = ({ tags: ignored, ...rest }) => rest;
      if (JSON.stringify(withoutTags(before.frontmatter)) !== JSON.stringify(withoutTags(after.frontmatter))
        || before.body.trim() !== after.body.trim()) fail(`文章 ${file} 含有正文或其他元数据改动，请通过文章发布处理`);
    }
    const generated = regeneratePublicSnapshot();
    if (!generated.ok) return generated;
    const checked = runChecks();
    if (!checked.ok) return checked;
    const paths = [...changed, ...["notes", "gallery", "search"].map((kind) => `content/public/metadata/${kind}.json`), "apps/web/public/feed.xml"];
    const result = publishPathsToGit(paths, "content: update tags");
    if (!result.ok && result.rollback) rollbackCommit(result.fullCommit);
    return result;
  } catch (error) { return { ok: false, message: error.message }; }
  finally { lock.release(); }
}
