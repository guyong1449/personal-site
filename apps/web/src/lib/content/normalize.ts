import type { ContentDocument, ContentKind, ContentListItem } from "./types";

type RawMetadata = Record<string, unknown>;
type RawFrontmatter = Record<string, unknown>;

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function normalizeListItem(kind: ContentKind, raw: RawMetadata): ContentListItem {
  return {
    kind,
    slug: asString(raw.slug) ?? "",
    title: asString(raw.title) ?? "",
    summary: asString(raw.summary) ?? "",
    tags: asStringArray(raw.tags),
    cover: asString(raw.cover),
    updated: asString(raw.updated),
    course: asString(raw.course),
    week: asString(raw.week),
    artCategory: asString(raw.art_category),
    series: asString(raw.series),
  };
}

export function normalizeDocument(
  kind: ContentKind,
  rawMetadata: RawMetadata,
  rawFrontmatter: RawFrontmatter,
  body: string,
): ContentDocument {
  const base = normalizeListItem(kind, rawMetadata);

  return {
    ...base,
    body,
    created: asString(rawFrontmatter.created),
    contentType: asString(rawFrontmatter.content_type),
  };
}
