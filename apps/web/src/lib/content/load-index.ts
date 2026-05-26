import fs from "node:fs/promises";
import { normalizeListItem } from "./normalize";
import { getMetadataPath } from "./paths";
import type { ContentKind, ContentListItem } from "./types";

export async function loadIndex(kind: ContentKind): Promise<ContentListItem[]> {
  const source = await fs.readFile(getMetadataPath(kind), "utf8");
  const parsed = JSON.parse(source) as Record<string, unknown>[];

  return parsed
    .map((item) => normalizeListItem(kind, item))
    .filter((item) => item.slug && item.title)
    .sort((left, right) => left.title.localeCompare(right.title, "zh-CN"));
}
