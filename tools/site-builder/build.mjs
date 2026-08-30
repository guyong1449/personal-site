import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
// STUDIO_REPO_ROOT redirects the builder to a fixture repository for tests.
const repoRoot = process.env.STUDIO_REPO_ROOT
  ? path.resolve(process.env.STUDIO_REPO_ROOT)
  : path.resolve(toolDir, "..", "..");
const siteRoot = path.join(repoRoot, "content", "site");
const publicRoot = path.join(repoRoot, "content", "public");

const KINDS = [
  { id: "notes", contentType: "note" },
  { id: "gallery", contentType: "gallery" },
];

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MARKDOWN_IMAGE_PATTERN =
  /!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^)]*["'])?\s*\)/g;
const URL_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;

function asString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isDateOnly(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function normalizeAssetReference(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("/") || trimmed.startsWith("\\") || URL_SCHEME_PATTERN.test(trimmed)) {
    return null;
  }

  const withoutSuffix = trimmed.split(/[?#]/, 1)[0].replace(/\\/g, "/");
  const relative = withoutSuffix.replace(/^assets\//, "");
  if (!relative || relative.split("/").some((part) => part === ".." || part === "")) {
    return null;
  }
  return relative;
}

function isExternalAssetReference(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return (
    !trimmed ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("\\") ||
    URL_SCHEME_PATTERN.test(trimmed)
  );
}

function markdownImageReferences(body) {
  return [...String(body ?? "").matchAll(MARKDOWN_IMAGE_PATTERN)].map(
    (match) => match[1] ?? match[2],
  );
}

function assetReferences(entry) {
  const references = new Set();
  if (entry.cover) {
    const cover = normalizeAssetReference(entry.cover);
    if (cover) {
      references.add(cover);
    }
  }
  for (const rawReference of markdownImageReferences(entry.body)) {
    const reference = normalizeAssetReference(rawReference);
    if (reference) {
      references.add(reference);
    }
  }
  return references;
}

function validateTags(tags, fileRef, errors) {
  if (!Array.isArray(tags) || tags.length === 0) {
    errors.push(`${fileRef}: tags must be a non-empty array`);
    return [];
  }

  const seen = new Set();
  const validTags = [];
  for (const tag of tags) {
    if (typeof tag !== "string" || tag.trim().length === 0) {
      errors.push(`${fileRef}: tags must contain non-empty strings`);
      continue;
    }
    if (/\s/.test(tag)) {
      errors.push(`${fileRef}: tag "${tag}" must not contain whitespace`);
    }
    if (seen.has(tag)) {
      errors.push(`${fileRef}: duplicate tag "${tag}"`);
    }
    seen.add(tag);
    validTags.push(tag);
  }
  return validTags;
}

function validateDateFields(frontmatter, fileRef, errors) {
  for (const field of ["created", "updated"]) {
    if (Object.prototype.hasOwnProperty.call(frontmatter, field) && !isDateOnly(frontmatter[field])) {
      errors.push(`${fileRef}: ${field} must use YYYY-MM-DD`);
    }
  }
}

function validateEntryAssets(entry, assetRoot, errors) {
  if (Object.prototype.hasOwnProperty.call(entry.frontmatter, "cover")) {
    if (typeof entry.frontmatter.cover !== "string" || !normalizeAssetReference(entry.cover)) {
      errors.push(`${entry.fileRef}: cover must be a relative asset path`);
    }
  }

  for (const rawReference of markdownImageReferences(entry.body)) {
    if (!isExternalAssetReference(rawReference) && !normalizeAssetReference(rawReference)) {
      errors.push(`${entry.fileRef}: image reference must be a relative asset path: ${rawReference}`);
    }
  }

  for (const reference of assetReferences(entry)) {
    const assetPath = path.resolve(assetRoot, reference);
    const relative = path.relative(assetRoot, assetPath);
    if (relative.startsWith("..") || path.isAbsolute(relative) || !fs.existsSync(assetPath)) {
      errors.push(`${entry.fileRef}: referenced asset is missing: ${reference}`);
    }
  }
}

function parseDocument(source, fileRef, errors) {
  const normalized = source.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    errors.push(`${fileRef}: missing frontmatter block`);
    return null;
  }

  const endIndex = normalized.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    errors.push(`${fileRef}: frontmatter block is not closed`);
    return null;
  }

  let frontmatter;
  try {
    const parsed = yaml.load(normalized.slice(4, endIndex));
    frontmatter =
      parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    errors.push(`${fileRef}: invalid frontmatter YAML (${error.message})`);
    return null;
  }

  return { frontmatter, body: normalized.slice(endIndex + 5).trim() };
}

function readEntries(kind, errors) {
  const sourceDir = path.join(siteRoot, kind.id);
  if (!fs.existsSync(sourceDir)) {
    return [];
  }

  const entries = [];
  for (const file of fs.readdirSync(sourceDir).sort()) {
    if (!file.endsWith(".md")) {
      continue;
    }

    const fileRef = `content/site/${kind.id}/${file}`;
    const source = fs.readFileSync(path.join(sourceDir, file), "utf8");
    const parsed = parseDocument(source, fileRef, errors);
    if (!parsed) {
      continue;
    }

    const frontmatter = parsed.frontmatter;
    const title = asString(frontmatter.title);
    const filenameSlug = file.slice(0, -3);
    const slug = asString(frontmatter.slug);
    const contentType = asString(frontmatter.content_type);

    if (!title) {
      errors.push(`${fileRef}: title is required`);
      continue;
    }
    if (!parsed.body) {
      errors.push(`${fileRef}: body must be non-empty`);
      continue;
    }
    if (!slug) {
      errors.push(`${fileRef}: slug is required in frontmatter`);
      continue;
    }
    if (!SLUG_PATTERN.test(slug)) {
      errors.push(`${fileRef}: slug "${slug}" must match ${SLUG_PATTERN}`);
      continue;
    }
    if (slug !== filenameSlug) {
      errors.push(`${fileRef}: frontmatter.slug "${slug}" must match filename "${filenameSlug}"`);
      continue;
    }
    if (contentType !== kind.contentType) {
      errors.push(
        `${fileRef}: content_type must be "${kind.contentType}" (got "${contentType ?? "none"}")`,
      );
      continue;
    }

    const entryErrors = [];
    const tags = validateTags(frontmatter.tags, fileRef, entryErrors);
    validateDateFields(frontmatter, fileRef, entryErrors);
    if (entryErrors.length > 0) {
      errors.push(...entryErrors);
      continue;
    }

    entries.push({
      fileRef,
      slug,
      frontmatter,
      body: parsed.body,
      title,
      summary: asString(frontmatter.summary) ?? "",
      tags,
      cover: asString(frontmatter.cover),
      created: asString(frontmatter.created),
      updated: asString(frontmatter.updated),
      pinned: frontmatter.pinned === true,
    });
  }

  return entries;
}

function assertUniqueSlugs(entries, kindId, errors) {
  const seen = new Map();
  for (const entry of entries) {
    if (seen.has(entry.slug)) {
      errors.push(
        `${entry.fileRef}: duplicate slug "${entry.slug}" (also in content/site/${kindId}/${seen.get(entry.slug)})`,
      );
      continue;
    }
    seen.set(entry.slug, path.basename(entry.fileRef));
  }
}

function recencyKey(entry) {
  return entry.updated ?? entry.created ?? "";
}

function sortByRecency(entries) {
  // Pinned entries float to the top; the rest keep recency order.
  return [...entries].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }
    const leftKey = recencyKey(left);
    const rightKey = recencyKey(right);
    if (leftKey !== rightKey) {
      return leftKey < rightKey ? 1 : -1;
    }
    return left.title.localeCompare(right.title, "zh-CN");
  });
}

function serializeFrontmatter(entry, kindId) {
  const lines = [
    "---",
    `title: ${JSON.stringify(entry.title)}`,
    `slug: ${JSON.stringify(entry.slug)}`,
    `content_type: ${JSON.stringify(kindId === "notes" ? "note" : "gallery")}`,
  ];

  if (entry.summary) lines.push(`summary: ${JSON.stringify(entry.summary)}`);
  if (entry.tags.length > 0) {
    lines.push("tags:", ...entry.tags.map((tag) => `  - ${JSON.stringify(tag)}`));
  }
  if (entry.cover) lines.push(`cover: ${JSON.stringify(entry.cover)}`);
  if (entry.created) lines.push(`created: ${JSON.stringify(entry.created)}`);
  if (entry.updated) lines.push(`updated: ${JSON.stringify(entry.updated)}`);
  if (entry.pinned) lines.push("pinned: true");
  if (kindId === "gallery") {
    const artCategory = asString(entry.frontmatter.art_category);
    const series = asString(entry.frontmatter.series);
    if (artCategory) lines.push(`art_category: ${JSON.stringify(artCategory)}`);
    if (series) lines.push(`series: ${JSON.stringify(series)}`);
  }

  return `${lines.join("\n")}\n---\n\n${entry.body}\n`;
}

function metadataRow(entry, kindId) {
  const row = {
    slug: entry.slug,
    title: entry.title,
    summary: entry.summary,
    tags: entry.tags,
    cover: entry.cover,
    created: entry.created,
    updated: entry.updated,
  };

  if (entry.pinned) {
    row.pinned = true;
  }
  if (kindId === "gallery") {
    row.art_category = asString(entry.frontmatter.art_category);
    row.series = asString(entry.frontmatter.series);
  }

  return row;
}

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function copyAssets(errors) {
  const sourceDir = path.join(siteRoot, "assets");
  const targetDir = path.join(publicRoot, "assets");
  resetDir(targetDir);

  if (!fs.existsSync(sourceDir)) {
    return 0;
  }

  let count = 0;
  const walk = (from, to) => {
    for (const item of fs.readdirSync(from, { withFileTypes: true })) {
      if (item.name === ".gitkeep") {
        continue;
      }
      const sourcePath = path.join(from, item.name);
      const targetPath = path.join(to, item.name);
      if (item.isDirectory()) {
        fs.mkdirSync(targetPath, { recursive: true });
        walk(sourcePath, targetPath);
        continue;
      }
      fs.copyFileSync(sourcePath, targetPath);
      count += 1;
    }
  };

  try {
    walk(sourceDir, targetDir);
  } catch (error) {
    errors.push(`content/site/assets: copy failed (${error.message})`);
  }
  return count;
}

function listAssetFiles(sourceDir) {
  const files = [];
  if (!fs.existsSync(sourceDir)) {
    return files;
  }

  const walk = (from) => {
    for (const item of fs.readdirSync(from, { withFileTypes: true })) {
      if (item.name === ".gitkeep") {
        continue;
      }
      const sourcePath = path.join(from, item.name);
      if (item.isDirectory()) {
        walk(sourcePath);
      } else {
        files.push(path.relative(sourceDir, sourcePath).split(path.sep).join("/"));
      }
    }
  };
  walk(sourceDir);
  return files;
}

function auditAssets(sourceDir, entries) {
  const referenced = new Set();
  for (const entry of entries) {
    for (const reference of assetReferences(entry)) {
      referenced.add(reference);
    }
  }
  return listAssetFiles(sourceDir).filter((file) => !referenced.has(file));
}

function stripMarkdown(body) {
  return String(body ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>|#+=-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);
}

function buildSearchIndex(entriesByKind) {
  const docs = [];
  for (const [kindId, entries] of entriesByKind) {
    for (const entry of entries) {
      docs.push({
        kind: kindId,
        slug: entry.slug,
        title: entry.title,
        summary: entry.summary,
        tags: entry.tags,
        text: stripMarkdown(entry.body),
      });
    }
  }
  return docs;
}

function reportErrors(errors) {
  console.error("site-builder failed:");
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
}

function build() {
  const errors = [];
  const summary = [];
  const entriesByKind = [];
  const assetRoot = path.join(siteRoot, "assets");

  for (const kind of KINDS) {
    const entries = sortByRecency(readEntries(kind, errors));
    assertUniqueSlugs(entries, kind.id, errors);
    entriesByKind.push([kind.id, entries]);
    for (const entry of entries) {
      validateEntryAssets(entry, assetRoot, errors);
    }
  }

  if (errors.length > 0) {
    reportErrors(errors);
    return { ok: false, errors };
  }

  const allEntries = entriesByKind.flatMap(([, entries]) => entries);
  const orphanAssets = auditAssets(assetRoot, allEntries);
  for (const asset of orphanAssets) {
    console.warn(`site-builder warning: unreferenced asset content/site/assets/${asset}`);
  }

  for (const kind of KINDS) {
    const entries = entriesByKind.find(([kindId]) => kindId === kind.id)[1];
    const outputDir = path.join(publicRoot, kind.id);
    resetDir(outputDir);

    for (const entry of entries) {
      const markdown = serializeFrontmatter(entry, kind.id);
      fs.writeFileSync(path.join(outputDir, `${entry.slug}.md`), markdown, "utf8");
    }

    const metadata = entries.map((entry) => metadataRow(entry, kind.id));
    fs.writeFileSync(
      path.join(publicRoot, "metadata", `${kind.id}.json`),
      `${JSON.stringify(metadata, null, 2)}\n`,
      "utf8",
    );

    summary.push(`${kind.id}: ${entries.length} document(s)`);
  }

  const searchIndex = buildSearchIndex(entriesByKind);
  fs.writeFileSync(
    path.join(publicRoot, "metadata", "search.json"),
    `${JSON.stringify(searchIndex)}\n`,
    "utf8",
  );

  const assetCount = copyAssets(errors);
  summary.push(`assets: ${assetCount} file(s)`, `search: ${searchIndex.length} doc(s)`);

  if (errors.length > 0) {
    reportErrors(errors);
    return { ok: false, errors };
  }

  console.log(`site-builder ok → ${summary.join(", ")}`);
  return { ok: true, orphanAssets, assetCount, searchCount: searchIndex.length };
}

export {
  KINDS,
  SLUG_PATTERN,
  assetReferences,
  auditAssets,
  build,
  parseDocument,
  sortByRecency,
  serializeFrontmatter,
  metadataRow,
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = build();
  if (!result.ok) {
    process.exitCode = 1;
  }
}
