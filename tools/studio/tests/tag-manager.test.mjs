import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, beforeEach, describe, it } from "node:test";
import { changeTags, publishTagChanges, readTagManager, replaceDocumentTags } from "../tag-manager.js";
import { parseFrontmatter } from "../lib.js";

let root;
const originalRoot = process.env.STUDIO_REPO_ROOT;
const originalE2E = process.env.STUDIO_E2E;
const originalFailure = process.env.STUDIO_FAIL_STAGE;
const write = (file, value) => { const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value); };
const note = (body, tags = '["DKU"]') => `---\r\ntitle: "Fixture"\r\nslug: "fixture"\r\ncontent_type: "note"\r\ntags: ${tags}\r\ntopics: ["DKU"]\r\ncreated: "2026-10-16"\r\n---\r\n\r\n${body}\r\n`;
const change = (input) => changeTags(root, { ...input, revision: readTagManager(root).revision });
const git = (args, cwd = root) => execFileSync("git", args, { cwd, encoding: "utf8", windowsHide: true }).trim();

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-tags-"));
  process.env.STUDIO_REPO_ROOT = root;
  process.env.STUDIO_E2E = "1";
  delete process.env.STUDIO_FAIL_STAGE;
  write("content/site/notes/fixture.md", note("Published body"));
  write(".local-content/notes/fixture.md", note("Different draft body"));
  fs.mkdirSync(path.join(root, "content/site/gallery"), { recursive: true });
  fs.mkdirSync(path.join(root, "content/site/assets"), { recursive: true });
  for (const kind of ["notes", "gallery", "search"]) write(`content/public/metadata/${kind}.json`, "[]\n");
  write("apps/web/public/feed.xml", "<rss/>\n");
});
afterEach(() => {
  for (const [key, value] of [["STUDIO_REPO_ROOT", originalRoot], ["STUDIO_E2E", originalE2E], ["STUDIO_FAIL_STAGE", originalFailure]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  fs.rmSync(root, { recursive: true, force: true });
});

describe("tag manager", () => {
  it("does not copy private draft-only tags into the public vocabulary", () => {
    write(".local-content/notes/private.md", note("Private body", '["PRIVATE"]'));
    change({ action: "create", name: "Math" });
    const catalog = JSON.parse(fs.readFileSync(path.join(root, "content/site/taxonomy.json"), "utf8"));
    assert.equal(catalog.tags.includes("PRIVATE"), false);
    assert.equal(readTagManager(root).tags.includes("PRIVATE"), true);
  });
  it("creates unused tags, rejects stale writes and validates names", () => {
    const old = readTagManager(root);
    const added = change({ action: "create", name: "Math" });
    assert.deepEqual(added.tags, ["DKU", "Math"]);
    assert.throws(() => changeTags(root, { action: "create", name: "CS", revision: old.revision }), /已更新/);
    assert.throws(() => change({ action: "create", name: "two words" }), /空格/);
    assert.throws(() => change({ action: "create", name: "DKU" }), /已存在/);
  });

  it("renames tags across published and draft copies without touching other bytes", () => {
    const before = fs.readFileSync(path.join(root, "content/site/notes/fixture.md"), "utf8");
    const result = change({ action: "rename", oldName: "DKU", name: "DKUCC" });
    assert.deepEqual(result.tags, ["DKUCC"]);
    const site = fs.readFileSync(path.join(root, "content/site/notes/fixture.md"), "utf8");
    assert.equal(site, before.replace('tags: ["DKU"]', 'tags:\r\n  - "DKUCC"'));
    assert.deepEqual(parseFrontmatter(site).frontmatter.topics, ["DKU"]);
    const draft = parseFrontmatter(fs.readFileSync(path.join(root, ".local-content/notes/fixture.md"), "utf8"));
    assert.match(draft.body, /Different draft body/);
    assert.deepEqual(draft.frontmatter.tags, ["DKUCC"]);
  });

  it("assigns per-document tags while retaining its unpublished draft body", () => {
    const result = change({ action: "assign", kind: "notes", slug: "fixture", tags: ["CS", "网络", "CS"] });
    assert.equal(result.documents.length, 1);
    assert.deepEqual(new Set(result.documents[0].tags), new Set(["CS", "网络"]));
    assert.throws(() => change({ action: "assign", kind: "notes", slug: "fixture", tags: [] }), /至少/);
    assert.throws(() => change({ action: "assign", kind: "notes", slug: "../fixture", tags: ["CS"] }), /标识/);
    const rows = JSON.parse(fs.readFileSync(path.join(root, "content/public/metadata/search.json"), "utf8"));
    assert.equal(rows[0].text, "Published body");
  });

  it("rolls back saved files and generated metadata on generation failure", () => {
    const before = fs.readFileSync(path.join(root, "content/site/notes/fixture.md"));
    process.env.STUDIO_FAIL_STAGE = "generate";
    assert.throws(() => change({ action: "rename", oldName: "DKU", name: "DUO" }), /故障注入/);
    assert.deepEqual(fs.readFileSync(path.join(root, "content/site/notes/fixture.md")), before);
    assert.equal(fs.existsSync(path.join(root, "content/site/taxonomy.json")), false);
    assert.deepEqual(readTagManager(root).tags, ["DKU"]);
  });

  it("rejects unfamiliar YAML tag layouts without corrupting the document", () => {
    assert.throws(() => replaceDocumentTags(note("Body", '\n  - "DKU"\n  # comment\n  - "CS"'), ["Math"]), /格式复杂/);
  });

  it("publishes only tag changes and leaves draft bodies and unrelated files out of git", () => {
    const bare = path.join(root, "remote.git");
    fs.mkdirSync(bare); git(["init", "--bare", "-b", "main"], bare);
    git(["init", "-b", "main"]); git(["config", "user.email", "tags@example.com"]); git(["config", "user.name", "tag-test"]);
    write(".gitignore", ".local-content/\nremote.git/\ncontent/public/notes/\ncontent/public/gallery/\ncontent/public/assets/\n");
    write("unrelated.txt", "original\n"); git(["add", "."]); git(["commit", "-m", "fixture"]);
    git(["remote", "add", "origin", bare]); git(["push", "-u", "origin", "main"]);
    change({ action: "rename", oldName: "DKU", name: "DKUCC" });
    write("unrelated.txt", "user work\n");
    const published = publishTagChanges(root, readTagManager(root).revision);
    assert.equal(published.ok, true, published.message);
    assert.equal(git(["log", "-1", "--format=%s"], bare), "content: update tags");
    assert.equal(git(["show", "HEAD:unrelated.txt"]), "original");
    assert.match(git(["show", "HEAD:content/site/notes/fixture.md"]), /Published body/);
    assert.doesNotMatch(git(["show", "HEAD:content/site/notes/fixture.md"]), /Different draft/);
    const commit = git(["rev-parse", "HEAD"]);
    write("content/site/notes/fixture.md", note("Unrelated unpublished body", '["DKUCC"]'));
    const rejected = publishTagChanges(root, readTagManager(root).revision);
    assert.equal(rejected.ok, false);
    assert.match(rejected.message, /正文/);
    assert.equal(git(["rev-parse", "HEAD"]), commit);
  });
});
