import { load } from "js-yaml";

export type ParsedFrontmatterDocument = {
  frontmatter: Record<string, unknown>;
  body: string;
};

export function parseFrontmatterDocument(source: string): ParsedFrontmatterDocument {
  if (!source.startsWith("---\n") && !source.startsWith("---\r\n")) {
    return { frontmatter: {}, body: source };
  }

  const normalized = source.replace(/\r\n/g, "\n");
  const endMarker = "\n---\n";
  const endIndex = normalized.indexOf(endMarker, 4);

  if (endIndex === -1) {
    return { frontmatter: {}, body: normalized };
  }

  const rawFrontmatter = normalized.slice(4, endIndex);
  const body = normalized.slice(endIndex + endMarker.length).trim();
  const parsed = load(rawFrontmatter);
  const frontmatter =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};

  return { frontmatter, body };
}
