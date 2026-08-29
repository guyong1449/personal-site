import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { KIND_IDS, parseFrontmatter, serializeFrontmatter } from "./lib.js";
import { publishDraft } from "./publish.js";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(toolDir, "..", "..");

// Mirrors publish.js path resolution: STUDIO_REPO_ROOT redirects to a
// fixture repository for tests.
function getPaths() {
  const repoRoot = process.env.STUDIO_REPO_ROOT
    ? path.resolve(process.env.STUDIO_REPO_ROOT)
    : defaultRepoRoot;
  return {
    repoRoot,
    localRoot: path.join(repoRoot, ".local-content"),
    siteRoot: path.join(repoRoot, "content", "site"),
  };
}

export function collectScheduled() {
  const { localRoot } = getPaths();
  const scheduled = [];
  for (const kind of KIND_IDS) {
    const dir = path.join(localRoot, kind);
    if (!fs.existsSync(dir)) {
      continue;
    }
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const parsed = parseFrontmatter(fs.readFileSync(path.join(dir, file), "utf8"));
      const publishAt = typeof parsed.frontmatter.publish_at === "string" ? parsed.frontmatter.publish_at : null;
      if (publishAt) {
        scheduled.push({ kind, slug: file.slice(0, -3), publishAt });
      }
    }
  }
  return scheduled;
}

export function clearPublishAt(kind, slug) {
  const { localRoot } = getPaths();
  const file = path.join(localRoot, kind, `${slug}.md`);
  if (!fs.existsSync(file)) {
    return;
  }
  const parsed = parseFrontmatter(fs.readFileSync(file, "utf8"));
  const { publish_at: _dropped, ...rest } = parsed.frontmatter;
  fs.writeFileSync(
    file,
    serializeFrontmatter(rest, parsed.body),
    "utf8",
  );
}

// Due scheduled drafts are published in place. A failed publish keeps its
// publish_at so the next tick retries; a successful one drops the marker.
export function runScheduledPublishes(now = Date.now()) {
  const results = [];
  for (const entry of collectScheduled()) {
    const due = new Date(entry.publishAt).getTime();
    if (Number.isNaN(due) || due > now) {
      continue;
    }
    const result = publishDraft(entry.kind, entry.slug);
    if (result.ok) {
      clearPublishAt(entry.kind, entry.slug);
    }
    results.push({ ...entry, ok: result.ok, message: result.message });
  }
  return results;
}
