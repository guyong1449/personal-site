import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ContentKind } from "./types";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(currentDir, "..", "..", "..");
const repoRoot = path.resolve(appRoot, "..", "..");

function resolvePublicRoot() {
  const candidates = [
    path.resolve(process.cwd(), "content", "public"),
    path.resolve(process.cwd(), "..", "..", "content", "public"),
    path.join(repoRoot, "content", "public"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

export function getPublicRoot() {
  return resolvePublicRoot();
}

export function getMetadataPath(kind: ContentKind | "search") {
  return path.join(getPublicRoot(), "metadata", `${kind}.json`);
}

export function getDocumentPath(kind: ContentKind, slug: string) {
  return path.join(getPublicRoot(), kind, `${slug}.md`);
}
