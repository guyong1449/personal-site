import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Content integrity check: every asset referenced by published markdown
// (body images, inline src, metadata covers) must exist, and every internal
// article link must resolve to a generated slug. Run after content
// regeneration; exits non-zero with a report on violations.

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.STUDIO_REPO_ROOT
  ? path.resolve(process.env.STUDIO_REPO_ROOT)
  : path.resolve(scriptDir, "..", "..", "..");
const publicRoot = path.join(repoRoot, "content", "public");

const KINDS = ["notes", "gallery"];
const problems = [];

function assetReferences(source) {
  const references = new Set();
  const patterns = [
    /!\[[^\]]*\]\((?:assets\/)?([^)\s]+)\)/g,
    /src="(?:assets\/)?([^"]+)"/g,
    /cover:\s*"?([^"\n]+)"?/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (match[1]) {
        references.add(path.basename(match[1].split("#")[0].split("?")[0]));
      }
    }
  }
  return [...references].filter((name) => name && name.includes("."));
}

function internalLinks(source) {
  const links = [];
  for (const match of source.matchAll(/\[[^\]]*\]\((\/(?:notes|gallery)\/[a-z0-9][a-z0-9-]*)\)/g)) {
    links.push(match[1]);
  }
  return links;
}

const slugs = { notes: new Set(), gallery: new Set() };
const documents = [];

for (const kind of KINDS) {
  const metadata = JSON.parse(
    fs.readFileSync(path.join(publicRoot, "metadata", `${kind}.json`), "utf8"),
  );
  for (const row of metadata) {
    slugs[kind].add(row.slug);
    documents.push({ kind, slug: row.slug, source: "" });
  }

  const dir = path.join(publicRoot, kind);
  if (!fs.existsSync(dir)) {
    continue;
  }
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const source = fs.readFileSync(path.join(dir, file), "utf8");
    const slug = file.slice(0, -3);
    documents.push({ kind, slug, source });
  }
}

for (const doc of documents) {
  for (const name of assetReferences(doc.source)) {
    if (!fs.existsSync(path.join(publicRoot, "assets", name))) {
      problems.push(`[${doc.kind}/${doc.slug}] 引用的资产不存在：assets/${name}`);
    }
  }
  for (const link of internalLinks(doc.source)) {
    const [, kind, slug] = link.split("/");
    if (!slugs[kind].has(slug)) {
      problems.push(`[${doc.kind}/${doc.slug}] 内部链接指向不存在的内容：${link}`);
    }
  }
}

if (problems.length > 0) {
  console.error(`check-links failed (${problems.length}):`);
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  process.exit(1);
}

console.log(`check-links ok → ${documents.length} document(s) scanned`);
