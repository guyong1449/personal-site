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

function asString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asStringArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim().length > 0)
    : [];
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
    const fallbackSlug = file.slice(0, -3).toLowerCase();
    const slug = asString(frontmatter.slug) ?? fallbackSlug;
    const contentType = asString(frontmatter.content_type);

    if (!title) {
      errors.push(`${fileRef}: title is required`);
      continue;
    }
    if (!SLUG_PATTERN.test(slug)) {
      errors.push(`${fileRef}: slug "${slug}" must match ${SLUG_PATTERN}`);
      continue;
    }
    if (contentType !== kind.contentType) {
      errors.push(
        `${fileRef}: content_type must be "${kind.contentType}" (got "${contentType ?? "none"}")`,
      );
      continue;
    }

    entries.push({
      fileRef,
      slug,
      frontmatter,
      body: parsed.body,
      title,
      summary: asString(frontmatter.summary) ?? "",
      tags: asStringArray(frontmatter.tags),
      cover: asString(frontmatter.cover),
      created: asString(frontmatter.created),
      updated: asString(frontmatter.updated),
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
  return [...entries].sort((left, right) => {
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
    updated: entry.updated,
  };

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

function build() {
  const errors = [];
  const summary = [];
  const entriesByKind = [];

  for (const kind of KINDS) {
    const entries = sortByRecency(readEntries(kind, errors));
    assertUniqueSlugs(entries, kind.id, errors);
    entriesByKind.push([kind.id, entries]);

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
    console.error("site-builder failed:");
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  console.log(`site-builder ok → ${summary.join(", ")}`);
}

export {
  KINDS,
  SLUG_PATTERN,
  parseDocument,
  sortByRecency,
  serializeFrontmatter,
  metadataRow,
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  build();
}
