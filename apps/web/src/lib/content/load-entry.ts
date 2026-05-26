import fs from "node:fs/promises";
import { parseFrontmatterDocument } from "./frontmatter";
import { loadIndex } from "./load-index";
import { normalizeDocument } from "./normalize";
import { getDocumentPath } from "./paths";
import type { ContentDocument, ContentKind } from "./types";

export async function loadEntry(kind: ContentKind, slug: string): Promise<ContentDocument | null> {
  const index = await loadIndex(kind);
  const metadata = index.find((item) => item.slug === slug);

  if (!metadata) {
    return null;
  }

  let source: string;

  try {
    source = await fs.readFile(getDocumentPath(kind, slug), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }

  const parsed = parseFrontmatterDocument(source);

  return normalizeDocument(kind, metadata, parsed.frontmatter, parsed.body);
}
