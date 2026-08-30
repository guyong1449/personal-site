import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Content integrity check: every local asset referenced by published markdown
// (body images, inline src, metadata covers) must exist, every internal article
// link must resolve to a generated slug, and unsafe URL protocols are rejected.

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.STUDIO_REPO_ROOT
  ? path.resolve(process.env.STUDIO_REPO_ROOT)
  : path.resolve(scriptDir, "..", "..", "..");
const publicRoot = path.join(repoRoot, "content", "public");

const KINDS = ["notes", "gallery"];
const SAFE_EXTERNAL_PROTOCOLS = new Set(["http", "https", "mailto", "tel"]);
const problems = [];

function stripQueryAndFragment(value) {
  return value.split(/[?#]/, 1)[0];
}

function decodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseDestination(raw) {
  const destination = raw.trim().replace(/^<|>$/g, "");
  const protocol = destination.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase();

  if (protocol) {
    return SAFE_EXTERNAL_PROTOCOLS.has(protocol)
      ? { kind: "external", destination, protocol }
      : { kind: "unsafe", destination, protocol };
  }

  if (destination.startsWith("//")) {
    return { kind: "external", destination, protocol: "https" };
  }

  const pathPart = decodePath(stripQueryAndFragment(destination));
  const rootedPath = pathPart.replace(/^\/+/, "");
  if (rootedPath.split("/").includes("..")) {
    return { kind: "unsafe", destination, protocol: "relative path" };
  }
  const normalizedPath = path.posix.normalize(rootedPath).replace(/^\.\//, "");

  if (normalizedPath === "." || normalizedPath === "") {
    return { kind: "fragment", destination };
  }

  if (normalizedPath === "assets" || normalizedPath.startsWith("assets/")) {
    const assetPath = normalizedPath.slice("assets/".length);
    return assetPath && !assetPath.startsWith("../") && assetPath !== ".."
      ? { kind: "asset", destination, assetPath }
      : { kind: "unsafe", destination, protocol: "relative path" };
  }

  const internal = normalizedPath.match(/^(notes|gallery)\/([a-z0-9][a-z0-9-]*)\/?$/);
  if (internal) {
    return { kind: "internal", destination, contentKind: internal[1], slug: internal[2] };
  }

  return { kind: "other", destination };
}

function collectDestinations(source) {
  const references = [];
  const markdownPattern = /(!?)\[[^\]]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
  for (const match of source.matchAll(markdownPattern)) {
    references.push({ raw: match[2] });
  }

  const srcPattern = /\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  for (const match of source.matchAll(srcPattern)) {
    references.push({ raw: match[1] ?? match[2] ?? match[3] });
  }

  const coverPattern = /^\s*cover:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))/gim;
  for (const match of source.matchAll(coverPattern)) {
    references.push({ raw: match[1] ?? match[2] ?? match[3] });
  }

  return references;
}

function checkReference(reference, doc, slugs) {
  const parsed = parseDestination(reference.raw);

  if (parsed.kind === "unsafe") {
    problems.push(
      `[${doc.kind}/${doc.slug}] 不安全的链接协议或路径：${parsed.protocol} (${reference.raw})`,
    );
    return;
  }

  // External URLs are valid references but do not belong to the local asset tree.
  if (parsed.kind === "external" || parsed.kind === "fragment" || parsed.kind === "other") {
    return;
  }

  if (parsed.kind === "asset") {
    const assetRoot = path.join(publicRoot, "assets");
    const target = path.resolve(assetRoot, parsed.assetPath);
    const relativeTarget = path.relative(assetRoot, target);
    if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget) || !fs.existsSync(target)) {
      problems.push(`[${doc.kind}/${doc.slug}] 引用的资产不存在：assets/${parsed.assetPath}`);
    }
    return;
  }

  if (parsed.kind === "internal" && !slugs[parsed.contentKind].has(parsed.slug)) {
    problems.push(
      `[${doc.kind}/${doc.slug}] 内部链接指向不存在的内容：/${parsed.contentKind}/${parsed.slug}`,
    );
  }
}

const slugs = { notes: new Set(), gallery: new Set() };
const documents = [];

for (const kind of KINDS) {
  const metadata = JSON.parse(
    fs.readFileSync(path.join(publicRoot, "metadata", `${kind}.json`), "utf8"),
  );
  for (const row of metadata) {
    slugs[kind].add(row.slug);
    documents.push({ kind, slug: row.slug, source: row.cover ? `cover: ${JSON.stringify(row.cover)}\n` : "" });
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
  for (const reference of collectDestinations(doc.source)) {
    checkReference(reference, doc, slugs);
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
