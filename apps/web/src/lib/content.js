import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "..", "..", "..", "..");
const contentRoot = path.join(repoRoot, "content", "public");

function splitFrontmatterDocument(source) {
  if (!source.startsWith("---\n")) {
    return {
      frontmatter: {},
      body: source
    };
  }

  const endIndex = source.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    return {
      frontmatter: {},
      body: source
    };
  }

  const frontmatter = {};
  const rawFrontmatter = source.slice(4, endIndex);

  for (const rawLine of rawFrontmatter.split("\n")) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("- ")) continue;

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const rawValue = trimmed.slice(colonIndex + 1).trim();
    frontmatter[key] = rawValue.replace(/^"(.*)"$/, "$1");
  }

  return {
    frontmatter,
    body: source.slice(endIndex + 5).trim()
  };
}

async function readJson(relativePath) {
  const targetPath = path.join(contentRoot, relativePath);
  const source = await fs.readFile(targetPath, "utf8");
  return JSON.parse(source);
}

export async function loadNoteIndex() {
  try {
    const notes = await readJson(path.join("metadata", "notes.json"));
    return notes.sort((left, right) => left.title.localeCompare(right.title, "zh-CN"));
  } catch {
    return [];
  }
}

export async function loadNoteDocument(slug) {
  const targetPath = path.join(contentRoot, "notes", `${slug}.md`);
  const source = await fs.readFile(targetPath, "utf8");
  return splitFrontmatterDocument(source);
}
