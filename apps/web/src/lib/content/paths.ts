import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ContentKind } from "./types";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(currentDir, "..", "..", "..");
const repoRoot = path.resolve(appRoot, "..", "..");
const publicRoot = path.join(repoRoot, "content", "public");

export function getPublicRoot() {
  return publicRoot;
}

export function getMetadataPath(kind: ContentKind) {
  return path.join(publicRoot, "metadata", `${kind}.json`);
}

export function getDocumentPath(kind: ContentKind, slug: string) {
  return path.join(publicRoot, kind, `${slug}.md`);
}
