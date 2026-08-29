import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

// End-to-end drill: draft -> publish -> snapshot -> unpublish -> restored
// draft, running against a throwaway git repository so the real content,
// origin, and Vercel pipeline are never touched. Heavy web checks are
// skipped via STUDIO_E2E=1; the git commit/push path runs for real against
// a local bare remote.

const FIXTURE_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "studio-e2e-"));
const REPO_ROOT = path.join(FIXTURE_HOME, "repo");
const BARE_ROOT = path.join(FIXTURE_HOME, "origin.git");
const SLUG = "e2e-post";

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

before(async () => {
  process.env.STUDIO_REPO_ROOT = REPO_ROOT;
  process.env.STUDIO_E2E = "1";

  // Bare remote + working repo with one initial commit on main.
  fs.mkdirSync(BARE_ROOT, { recursive: true });
  git(BARE_ROOT, ["init", "--bare", "-b", "main"]);

  fs.mkdirSync(REPO_ROOT, { recursive: true });
  git(REPO_ROOT, ["init", "-b", "main"]);
  git(REPO_ROOT, ["config", "user.email", "e2e@example.com"]);
  git(REPO_ROOT, ["config", "user.name", "e2e"]);
  write(path.join(REPO_ROOT, "content", "site", "notes", ".gitkeep"), "");
  write(path.join(REPO_ROOT, "content", "site", "gallery", ".gitkeep"), "");
  write(path.join(REPO_ROOT, "content", "site", "assets", ".gitkeep"), "");
  write(path.join(REPO_ROOT, "content", "public", "metadata", "notes.json"), "[]\n");
  write(path.join(REPO_ROOT, "content", "public", "metadata", "gallery.json"), "[]\n");
  write(path.join(REPO_ROOT, "content", "public", "metadata", "search.json"), "[]\n");
  write(path.join(REPO_ROOT, "apps", "web", "public", "feed.xml"), "<rss></rss>\n");
  write(path.join(REPO_ROOT, ".local-content", "notes", ".gitkeep"), "");
  write(path.join(REPO_ROOT, ".local-content", "assets", ".gitkeep"), "");
  git(REPO_ROOT, ["add", "-A"]);
  git(REPO_ROOT, ["commit", "-m", "init"]);
  git(REPO_ROOT, ["remote", "add", "origin", BARE_ROOT]);
  git(REPO_ROOT, ["push", "-u", "origin", "main"]);

  // Draft with an exclusive asset, ready to publish.
  write(
    path.join(REPO_ROOT, ".local-content", "notes", `${SLUG}.md`),
    [
      "---",
      'title: "端到端演练"',
      `slug: "${SLUG}"`,
      'content_type: "note"',
      'status: "draft"',
      'summary: "演练摘要"',
      "tags:",
      '  - "topic/e2e"',
      'cover: "e2e.png"',
      'created: "2026-08-29"',
      'updated: "2026-08-29"',
      "---",
      "",
      "演练正文 ![图](assets/e2e.png)",
      "",
    ].join("\n"),
  );
  write(path.join(REPO_ROOT, ".local-content", "assets", "e2e.png"), "png-bytes");
});

after(() => {
  delete process.env.STUDIO_REPO_ROOT;
  delete process.env.STUDIO_E2E;
  fs.rmSync(FIXTURE_HOME, { recursive: true, force: true });
});

describe("publish -> unpublish drill", () => {
  it("publishes: draft lands on site, origin gets one content commit", async () => {
    const { publishDraft } = await import("../publish.js");
    const result = publishDraft("notes", SLUG);

    assert.equal(result.ok, true, `publish failed: ${result.message}`);

    const siteMd = fs.readFileSync(
      path.join(REPO_ROOT, "content", "site", "notes", `${SLUG}.md`),
      "utf8",
    );
    assert.match(siteMd, /content_type: "note"/);
    assert.match(siteMd, /topic\/e2e/);
    assert.ok(fs.existsSync(path.join(REPO_ROOT, "content", "site", "assets", "e2e.png")));

    const metadata = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, "content", "public", "metadata", "notes.json"), "utf8"),
    );
    assert.equal(metadata.length, 1);
    assert.equal(metadata[0].slug, SLUG);

    const message = git(REPO_ROOT, ["log", "-1", "--format=%s"]);
    assert.equal(message, `content: publish ${SLUG}`);
    const files = git(REPO_ROOT, ["show", "--name-only", "--format=", "HEAD"]).split("\n");
    for (const file of files) {
      assert.match(file, /^(content\/(site|public\/metadata)\/|apps\/web\/public\/feed\.xml$)/);
    }
    const remoteHead = git(BARE_ROOT, ["log", "-1", "--format=%s"]);
    assert.equal(remoteHead, `content: publish ${SLUG}`);
  });

  it("unpublishes: site copy removed, draft restored, origin gets the unpublish commit", async () => {
    const { unpublishToDraft } = await import("../unpublish.js");
    const result = unpublishToDraft("notes", SLUG);

    assert.equal(result.ok, true, `unpublish failed: ${result.message}`);
    assert.equal(result.removedAssets, 1); // e2e.png was exclusive to this document

    assert.ok(
      !fs.existsSync(path.join(REPO_ROOT, "content", "site", "notes", `${SLUG}.md`)),
    );
    const draft = fs.readFileSync(
      path.join(REPO_ROOT, ".local-content", "notes", `${SLUG}.md`),
      "utf8",
    );
    assert.match(draft, /status: "draft"/);
    assert.match(draft, /演练正文/);

    const metadata = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, "content", "public", "metadata", "notes.json"), "utf8"),
    );
    assert.equal(metadata.length, 0);

    const message = git(REPO_ROOT, ["log", "-1", "--format=%s"]);
    assert.equal(message, `content: unpublish ${SLUG}`);
    const remoteHead = git(BARE_ROOT, ["log", "-1", "--format=%s"]);
    assert.equal(remoteHead, `content: unpublish ${SLUG}`);
  });
});
