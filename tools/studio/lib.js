import yaml from "js-yaml";

export const KIND_IDS = ["notes", "gallery"];

export function nowIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

// Stable slug: ascii lowercase words joined by hyphens; CJK titles fall back
// to <prefix>-<timestamp> so the slug never churns between saves.
export function slugify(input, fallbackPrefix = "item", now = Date.now()) {
  const ascii = String(input ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  if (ascii.length >= 2) {
    return ascii;
  }
  return `${fallbackPrefix}-${new Date(now).toISOString().slice(0, 19).replace(/[-:T]/g, "")}`;
}

export function extractTitle(body) {
  const match = String(body ?? "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => /^#\s+\S/.test(line));

  return match ? match.replace(/^#\s+/, "").trim() : null;
}

export function extractSummary(body, maxLength = 120) {
  const paragraph = String(body ?? "")
    .split(/\n\s*\n/)
    .map((chunk) =>
      chunk
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"))
        .join(" "),
    )
    .find((text) => text.length > 0);

  if (!paragraph) {
    return "";
  }
  const flat = paragraph.replace(/\s+/g, " ").trim();
  return flat.length > maxLength ? `${flat.slice(0, maxLength - 1)}…` : flat;
}

export function parseFrontmatter(source) {
  const normalized = String(source ?? "").replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { frontmatter: {}, body: normalized };
  }

  const endIndex = normalized.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    return { frontmatter: {}, body: normalized };
  }

  let frontmatter = {};
  try {
    const parsed = yaml.load(normalized.slice(4, endIndex));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      frontmatter = parsed;
    }
  } catch {
    frontmatter = {};
  }

  return { frontmatter, body: normalized.slice(endIndex + 5) };
}

export function serializeFrontmatter(fields, body) {
  const lines = ["---"];

  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        continue;
      }
      lines.push(`${key}:`, ...value.map((item) => `  - ${JSON.stringify(item)}`));
      continue;
    }
    lines.push(`${key}: ${JSON.stringify(String(value))}`);
  }

  return `${lines.join("\n")}\n---\n\n${String(body ?? "").replace(/\r\n/g, "\n").trim()}\n`;
}

export function sanitizeFileName(name) {
  const base = path_basename(String(name ?? ""));
  return base.replace(/[^\w.\-\u4e00-\u9fa5]+/g, "_").slice(0, 120);
}

function path_basename(value) {
  const parts = value.split(/[\\/]/);
  return parts[parts.length - 1] ?? "";
}
