import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import { publishDraft } from "../publish.js";
import { unpublishToDraft } from "../unpublish.js";

const repoRoot = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const builderFile = path.join(repoRoot, "tools", "site-builder", "build.mjs");
const fixtureRoots = [];

after(() => {
  for (const root of fixtureRoots) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

function remoteFor(root) {
  return `${root}-remote.git`;
}

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", shell: false });
  assert.equal(result.status, 0, `${args.join(" ")} failed\n${result.stderr}`);
  return result.stdout.trim();
}

function markdown(slug, body = "A published note.", extra = "") {
  return [
    "---",
    `title: \"${slug}\"`,
    `slug: \"${slug}\"`,
    'content_type: "note"',
    'tags: ["topic/test"]',
    'created: "2026-08-01"',
    `updated: "2026-08-02"`,
    extra,
    "---",
    "",
    body,
    "",
  ].filter(Boolean).join("\n");
}

function createRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-recovery-"));
  write(
    path.join(root, ".gitignore"),
    [
      "node_modules/",
      ".local-content/",
      "content/public/notes/*",
      "content/public/gallery/*",
      "content/public/assets/*",
      "apps/web/public/assets/",
      "!content/public/notes/.gitkeep",
      "!content/public/gallery/.gitkeep",
      "!content/public/assets/.gitkeep",
      "",
    ].join("\n"),
  );
  for (const dir of [
    "content/site/notes",
    "content/site/gallery",
    "content/site/assets",
    "content/public/metadata",
    "apps/web/public/assets",
    ".local-content/notes",
    ".local-content/gallery",
    ".local-content/assets",
  ]) {
    write(path.join(root, dir, ".gitkeep"), "");
  }
  write(path.join(root, "content", "public", "metadata", "notes.json"), "[]\n");
  write(path.join(root, "content", "public", "metadata", "gallery.json"), "[]\n");
  write(path.join(root, "content", "public", "metadata", "search.json"), "[]\n");
  write(path.join(root, "apps", "web", "public", "feed.xml"), "<rss/>\n");

  git(root, ["init", "-b", "main"]);
  git(root, ["config", "user.email", "studio-test@example.invalid"]);
  git(root, ["config", "user.name", "Studio Test"]);
  git(root, ["add", "-A"]);
  git(root, ["commit", "-m", "fixture baseline"]);

  const remote = `${root}-remote.git`;
  fixtureRoots.push(root, remote);
  git(root, ["init", "--bare", remote]);
  git(root, ["remote", "add", "origin", remote]);
  git(root, ["push", "-u", "origin", "main"]);
  return root;
}

function build(root) {
  const result = spawnSync(process.execPath, [builderFile], {
    cwd: root,
    encoding: "utf8",
    shell: false,
    env: { ...process.env, STUDIO_REPO_ROOT: root },
  });
  assert.equal(result.status, 0, `fixture build failed\n${result.stdout}\n${result.stderr}`);
}

function withEnvironment(root, failureStage, operation) {
  const previous = {
    repo: process.env.STUDIO_REPO_ROOT,
    e2e: process.env.STUDIO_E2E,
    failure: process.env.STUDIO_FAIL_STAGE,
  };
  process.env.STUDIO_REPO_ROOT = root;
  process.env.STUDIO_E2E = "1";
  if (failureStage) process.env.STUDIO_FAIL_STAGE = failureStage;
  else delete process.env.STUDIO_FAIL_STAGE;
  try {
    return operation();
  } finally {
    if (previous.repo === undefined) delete process.env.STUDIO_REPO_ROOT;
    else process.env.STUDIO_REPO_ROOT = previous.repo;
    if (previous.e2e === undefined) delete process.env.STUDIO_E2E;
    else process.env.STUDIO_E2E = previous.e2e;
    if (previous.failure === undefined) delete process.env.STUDIO_FAIL_STAGE;
    else process.env.STUDIO_FAIL_STAGE = previous.failure;
  }
}

function prepareDraft(root, slug = "first") {
  write(
    path.join(root, ".local-content", "notes", `${slug}.md`),
    markdown(slug, `A note with an image.\n\n![cover](assets/${slug}.png)`, `cover: "${slug}.png"`),
  );
  write(path.join(root, ".local-content", "assets", `${slug}.png`), `${slug}-asset\n`);
}

function assertBaseline(root, baselineHead, metadata) {
  assert.equal(read(path.join(root, "content", "site", "notes", "first.md")), null);
  assert.equal(read(path.join(root, "content", "site", "assets", "first.png")), null);
  assert.equal(read(path.join(root, "content", "public", "metadata", "notes.json")), metadata);
  assert.equal(git(root, ["rev-parse", "HEAD"]), baselineHead);
  assert.equal(git(root, ["status", "--porcelain"]), "");
}

describe("Studio publish and unpublish recovery", () => {
  it("restores content and assets for every publish failure stage", () => {
    for (const stage of ["generate", "checks", "stage", "commit", "push"]) {
      const root = createRepo();
      prepareDraft(root);
      const baselineHead = git(root, ["rev-parse", "HEAD"]);
      const metadata = read(path.join(root, "content", "public", "metadata", "notes.json"));
      const result = withEnvironment(root, stage, () => publishDraft("notes", "first"));
      assert.equal(result.ok, false, stage);
      assert.equal(result.stage, stage, stage);
      assertBaseline(root, baselineHead, metadata);
    }
  });

  it("keeps a publish commit when the push result is uncertain", () => {
    const root = createRepo();
    prepareDraft(root);
    const baselineHead = git(root, ["rev-parse", "HEAD"]);
    const result = withEnvironment(root, "push-unknown", () => publishDraft("notes", "first"));
    assert.equal(result.ok, false);
    assert.equal(result.stage, "push-unknown");
    assert.match(result.message, /无法确认远端状态/);
    assert.notEqual(git(root, ["rev-parse", "HEAD"]), baselineHead);
    assert.equal(git(root, ["status", "--porcelain"]), "");
    assert.equal(git(remoteFor(root), ["rev-parse", "refs/heads/main"]), baselineHead);
    assert.ok(fs.existsSync(path.join(root, "content", "site", "notes", "first.md")));
  });

  it("restores the published document and asset for every unpublish failure stage", () => {
    for (const stage of ["generate", "checks", "stage", "commit", "push"]) {
      const root = createRepo();
      write(
        path.join(root, "content", "site", "notes", "unpub.md"),
        markdown("unpub", "An existing note.\n\n![asset](assets/unpub.png)", 'cover: "unpub.png"'),
      );
      write(path.join(root, "content", "site", "assets", "unpub.png"), "existing-asset\n");
      build(root);
      git(root, ["add", "-A", "--", "content/site", "content/public", "apps/web/public/feed.xml"]);
      git(root, ["commit", "-m", "fixture published note"]);
      git(root, ["push"]);
      const baselineHead = git(root, ["rev-parse", "HEAD"]);
      const siteFile = path.join(root, "content", "site", "notes", "unpub.md");
      const assetFile = path.join(root, "content", "site", "assets", "unpub.png");
      const siteMarkdown = read(siteFile);
      const siteAsset = read(assetFile);
      const metadata = read(path.join(root, "content", "public", "metadata", "notes.json"));
      const result = withEnvironment(root, stage, () => unpublishToDraft("notes", "unpub"));
      assert.equal(result.ok, false, stage);
      assert.equal(result.stage, stage, stage);
      assert.equal(read(siteFile), siteMarkdown);
      assert.equal(read(assetFile), siteAsset);
      assert.equal(read(path.join(root, ".local-content", "notes", "unpub.md")), null);
      assert.equal(read(path.join(root, "content", "public", "metadata", "notes.json")), metadata);
      assert.equal(git(root, ["rev-parse", "HEAD"]), baselineHead);
      assert.equal(git(root, ["status", "--porcelain"]), "");
    }
  });

  it("keeps an unpublish commit when the push result is uncertain", () => {
    const root = createRepo();
    write(
      path.join(root, "content", "site", "notes", "unpub.md"),
      markdown("unpub", "An existing note.\n\n![asset](assets/unpub.png)", 'cover: "unpub.png"'),
    );
    write(path.join(root, "content", "site", "assets", "unpub.png"), "existing-asset\n");
    build(root);
    git(root, ["add", "-A", "--", "content/site", "content/public", "apps/web/public/feed.xml"]);
    git(root, ["commit", "-m", "fixture published note"]);
    git(root, ["push"]);
    const baselineHead = git(root, ["rev-parse", "HEAD"]);
    const result = withEnvironment(root, "push-unknown", () => unpublishToDraft("notes", "unpub"));
    assert.equal(result.ok, false);
    assert.equal(result.stage, "push-unknown");
    assert.notEqual(git(root, ["rev-parse", "HEAD"]), baselineHead);
    assert.equal(git(root, ["status", "--porcelain"]), "");
    assert.equal(git(remoteFor(root), ["rev-parse", "refs/heads/main"]), baselineHead);
    assert.ok(fs.existsSync(path.join(root, ".local-content", "notes", "unpub.md")));
    assert.equal(read(path.join(root, ".local-content", "assets", "unpub.png")), "existing-asset\n");
    assert.ok(!fs.existsSync(path.join(root, "content", "site", "notes", "unpub.md")));
  });

  it("rejects a same-name asset with different content before modifying the site", () => {
    const root = createRepo();
    write(path.join(root, "content", "site", "assets", "shared.png"), "old-asset\n");
    prepareDraft(root, "first");
    fs.renameSync(
      path.join(root, ".local-content", "assets", "first.png"),
      path.join(root, ".local-content", "assets", "shared.png"),
    );
    const draftFile = path.join(root, ".local-content", "notes", "first.md");
    fs.writeFileSync(
      draftFile,
      fs.readFileSync(draftFile, "utf8").replaceAll("first.png", "shared.png"),
      "utf8",
    );
    const baselineHead = git(root, ["rev-parse", "HEAD"]);
    const result = withEnvironment(root, null, () => publishDraft("notes", "first"));
    assert.equal(result.ok, false);
    assert.equal(result.stage, "asset");
    assert.equal(read(path.join(root, "content", "site", "assets", "shared.png")), "old-asset\n");
    assert.equal(read(path.join(root, "content", "site", "notes", "first.md")), null);
    assert.equal(git(root, ["rev-parse", "HEAD"]), baselineHead);
    assert.match(git(root, ["status", "--porcelain"]), /content\/site\/assets\/shared\.png/);
  });

  it("stages only the current document and generated outputs with a parallel site edit", () => {
    const root = createRepo();
    write(path.join(root, "content", "site", "notes", "second.md"), markdown("second", "Parallel edit.\n"));
    prepareDraft(root);
    const result = withEnvironment(root, null, () => publishDraft("notes", "first"));
    assert.equal(result.ok, true, result.message);
    const committedFiles = git(root, ["show", "--format=", "--name-only", "HEAD"]).split("\n").filter(Boolean);
    assert.ok(committedFiles.includes("content/site/notes/first.md"));
    assert.ok(!committedFiles.includes("content/site/notes/second.md"));
    assert.match(git(root, ["status", "--porcelain"]), /content\/site\/notes\/second\.md/);
  });
});
