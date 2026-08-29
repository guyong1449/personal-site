import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

// Scheduled publishing drill: a draft with a past publish_at is picked up
// by the scheduler sweep, published against the fixture remote, and its
// marker cleared; future and cleared drafts are left alone.

const FIXTURE_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "studio-sched-"));
const REPO_ROOT = path.join(FIXTURE_HOME, "repo");
const BARE_ROOT = path.join(FIXTURE_HOME, "origin.git");

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

function draftWith(publishAt) {
  return [
    "---",
    'title: "定时演练"',
    'slug: "sched-post"',
    'content_type: "note"',
    'status: "draft"',
    "tags: []",
    'created: "2026-08-29"',
    'updated: "2026-08-29"',
    ...(publishAt ? [`publish_at: "${publishAt}"`] : []),
    "---",
    "",
    "定时演练正文",
    "",
  ].join("\n");
}

before(async () => {
  process.env.STUDIO_REPO_ROOT = REPO_ROOT;
  process.env.STUDIO_E2E = "1";

  fs.mkdirSync(BARE_ROOT, { recursive: true });
  git(BARE_ROOT, ["init", "--bare", "-b", "main"]);
  fs.mkdirSync(REPO_ROOT, { recursive: true });
  git(REPO_ROOT, ["init", "-b", "main"]);
  git(REPO_ROOT, ["config", "user.email", "e2e@example.com"]);
  git(REPO_ROOT, ["config", "user.name", "e2e"]);
  write(path.join(REPO_ROOT, "content", "site", "notes", ".gitkeep"), "");
  write(path.join(REPO_ROOT, "content", "public", "metadata", "notes.json"), "[]\n");
  write(path.join(REPO_ROOT, "content", "public", "metadata", "gallery.json"), "[]\n");
  write(path.join(REPO_ROOT, "content", "public", "metadata", "search.json"), "[]\n");
  write(path.join(REPO_ROOT, "apps", "web", "public", "feed.xml"), "<rss></rss>\n");
  write(path.join(REPO_ROOT, ".local-content", "assets", ".gitkeep"), "");
  git(REPO_ROOT, ["add", "-A"]);
  git(REPO_ROOT, ["commit", "-m", "init"]);
  git(REPO_ROOT, ["remote", "add", "origin", BARE_ROOT]);
  git(REPO_ROOT, ["push", "-u", "origin", "main"]);

  write(path.join(REPO_ROOT, ".local-content", "notes", "sched-post.md"), draftWith("2020-01-01T09:00"));
});

after(() => {
  delete process.env.STUDIO_REPO_ROOT;
  delete process.env.STUDIO_E2E;
  fs.rmSync(FIXTURE_HOME, { recursive: true, force: true });
});

describe("scheduled publishing", () => {
  it("publishes a due draft and clears its marker", async () => {
    const { runScheduledPublishes, collectScheduled } = await import("../scheduler.js");

    assert.equal(collectScheduled().length, 1);
    const results = runScheduledPublishes();

    assert.equal(results.length, 1);
    assert.equal(results[0].ok, true, `scheduled publish failed: ${results[0].message}`);
    assert.ok(fs.existsSync(path.join(REPO_ROOT, "content", "site", "notes", "sched-post.md")));
    assert.equal(collectScheduled().length, 0);

    const draft = fs.readFileSync(
      path.join(REPO_ROOT, ".local-content", "notes", "sched-post.md"),
      "utf8",
    );
    assert.ok(!draft.includes("publish_at"));
    assert.equal(git(BARE_ROOT, ["log", "-1", "--format=%s"]), "content: publish sched-post");
  });

  it("leaves future drafts and published drafts alone", async () => {
    fs.writeFileSync(
      path.join(REPO_ROOT, ".local-content", "notes", "sched-post.md"),
      draftWith("2099-01-01T09:00"),
      "utf8",
    );
    const { runScheduledPublishes, collectScheduled } = await import("../scheduler.js");

    const results = runScheduledPublishes();
    assert.equal(results.length, 0);
    assert.equal(collectScheduled().length, 1);
    assert.ok(fs.existsSync(path.join(REPO_ROOT, ".local-content", "notes", "sched-post.md")));
    assert.equal(git(BARE_ROOT, ["log", "-1", "--format=%s"]), "content: publish sched-post");
  });
});
