import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { spawnSync } from "node:child_process";
import {
  KINDS,
  parseDocument,
  sortByRecency,
  serializeFrontmatter,
} from "../build.mjs";

const BUILD_FILE = fileURLToPath(new URL("../build.mjs", import.meta.url));

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "site-builder-test-"));
  write(path.join(root, "content", "public", "metadata", "notes.json"), "sentinel-notes\n");
  write(path.join(root, "content", "public", "metadata", "gallery.json"), "[]\n");
  write(path.join(root, "content", "public", "metadata", "search.json"), "[]\n");
  fs.mkdirSync(path.join(root, "content", "site", "notes"), { recursive: true });
  fs.mkdirSync(path.join(root, "content", "site", "gallery"), { recursive: true });
  fs.mkdirSync(path.join(root, "content", "site", "assets"), { recursive: true });
  return root;
}

function runBuilder(root) {
  return spawnSync(process.execPath, [BUILD_FILE], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, STUDIO_REPO_ROOT: root },
  });
}

function noteFrontmatter(slug, extra = []) {
  const extraKeys = new Set(extra.map((line) => line.split(":", 1)[0].trim()));
  return [
    "---",
    `title: "${slug}"`,
    `slug: "${slug}"`,
    'content_type: "note"',
    ...(extraKeys.has("tags") ? [] : ['tags: ["topic/test"]']),
    ...(extraKeys.has("created") ? [] : ['created: "2026-08-01"']),
    ...(extraKeys.has("updated") ? [] : ['updated: "2026-08-02"']),
    ...extra,
    "---",
    "",
  ].join("\n");
}

describe("parseDocument", () => {
  it("splits frontmatter and body", () => {
    const parsed = parseDocument(
      '---\ntitle: "A"\ncontent_type: note\n---\n\nBody line.\n',
      "test.md",
      [],
    );

    assert.equal(parsed.frontmatter.title, "A");
    assert.equal(parsed.frontmatter.content_type, "note");
    assert.equal(parsed.body, "Body line.");
  });

  it("reports missing frontmatter as an error", () => {
    const errors = [];
    const parsed = parseDocument("no frontmatter here\n", "test.md", errors);

    assert.equal(parsed, null);
    assert.match(errors[0], /missing frontmatter/);
  });
});

describe("serializeFrontmatter", () => {
  it("round-trips an entry with stable key order", () => {
    const entry = {
      title: "笔记 A",
      slug: "note-a",
      summary: "摘要",
      tags: ["course/CS308", "topic/algorithm"],
      cover: null,
      created: "2026-08-01",
      updated: "2026-08-28",
      frontmatter: {},
      body: "正文",
    };

    const markdown = serializeFrontmatter(entry, "notes");
    const reparsed = parseDocument(markdown, "roundtrip.md", []);

    assert.equal(reparsed.frontmatter.title, "笔记 A");
    assert.deepEqual(reparsed.frontmatter.tags, ["course/CS308", "topic/algorithm"]);
    assert.equal(reparsed.frontmatter.content_type, "note");
    assert.equal(reparsed.body, "正文");
  });

  it("keeps gallery specific fields", () => {
    const entry = {
      title: "画作",
      slug: "art-1",
      summary: "",
      tags: [],
      cover: null,
      created: null,
      updated: null,
      frontmatter: { art_category: "sketch", series: "alpha" },
      body: "x",
    };

    const markdown = serializeFrontmatter(entry, "gallery");
    assert.match(markdown, /art_category: "sketch"/);
    assert.match(markdown, /series: "alpha"/);
  });
});

describe("sortByRecency", () => {
  it("orders by updated descending with title fallback", () => {
    const sorted = sortByRecency([
      { title: "旧", slug: "old", updated: "2026-01-01", created: null },
      { title: "新", slug: "new", updated: "2026-08-28", created: null },
      { title: "b", slug: "b", updated: null, created: null },
      { title: "a", slug: "a", updated: null, created: null },
    ]);

    assert.deepEqual(
      sorted.map((entry) => entry.slug),
      ["new", "old", "a", "b"],
    );
  });
});

describe("kinds", () => {
  it("only exposes notes and gallery", () => {
    assert.deepEqual(
      KINDS.map((kind) => kind.id),
      ["notes", "gallery"],
    );
  });
});

describe("content contract and asset audit", () => {
  it("rejects invalid content before writing generated snapshots", () => {
    const root = fixture();
    try {
      write(
        path.join(root, "content", "site", "notes", "empty-body.md"),
        noteFrontmatter("empty-body"),
      );
      write(
        path.join(root, "content", "site", "notes", "wrong-name.md"),
        noteFrontmatter("different-slug") + "正文\n",
      );
      write(
        path.join(root, "content", "site", "notes", "bad-date.md"),
        noteFrontmatter("bad-date", ['created: "2026-02-30"']) + "正文\n",
      );
      write(
        path.join(root, "content", "site", "notes", "duplicate-tags.md"),
        noteFrontmatter("duplicate-tags", ["tags:", '  - "topic/test"', '  - "topic/test"']) + "正文\n",
      );
      write(
        path.join(root, "content", "site", "notes", "empty-tags.md"),
        noteFrontmatter("empty-tags", ["tags: []"]) + "正文\n",
      );
      write(
        path.join(root, "content", "site", "notes", "missing-cover.md"),
        noteFrontmatter("missing-cover", ['cover: "missing.png"']) + "正文\n",
      );
      write(
        path.join(root, "content", "site", "notes", "missing-inline.md"),
        noteFrontmatter("missing-inline") + "![图](assets/missing.png)\n",
      );
      write(
        path.join(root, "content", "site", "notes", "bad-image-path.md"),
        noteFrontmatter("bad-image-path") + "![图](assets/../secret.png)\n",
      );

      const result = runBuilder(root);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /empty-body\.md: body must be non-empty/);
      assert.match(result.stderr, /wrong-name\.md: frontmatter\.slug/);
      assert.match(result.stderr, /bad-date\.md: created must use YYYY-MM-DD/);
      assert.match(result.stderr, /duplicate-tags\.md: duplicate tag/);
      assert.match(result.stderr, /empty-tags\.md: tags must be a non-empty array/);
      assert.match(result.stderr, /missing-cover\.md: referenced asset is missing: missing\.png/);
      assert.match(result.stderr, /missing-inline\.md: referenced asset is missing: missing\.png/);
      assert.match(result.stderr, /bad-image-path\.md: image reference must be a relative asset path/);
      assert.equal(
        fs.readFileSync(path.join(root, "content", "public", "metadata", "notes.json"), "utf8"),
        "sentinel-notes\n",
      );
      assert.equal(fs.existsSync(path.join(root, "content", "public", "notes")), false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("warns about orphan assets without deleting or omitting them", () => {
    const root = fixture();
    try {
      write(
        path.join(root, "content", "site", "notes", "good-note.md"),
        noteFrontmatter("good-note", ['cover: "cover.png"']) +
          '正文 ![图](assets/inline.webp "title")，外链 ![外链](https://example.com/image.png)\n',
      );
      write(path.join(root, "content", "site", "assets", "cover.png"), "cover");
      write(path.join(root, "content", "site", "assets", "inline.webp"), "inline");
      write(path.join(root, "content", "site", "assets", "orphan.png"), "orphan");

      const result = runBuilder(root);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stderr, /unreferenced asset content\/site\/assets\/orphan\.png/);
      assert.ok(fs.existsSync(path.join(root, "content", "site", "assets", "orphan.png")));
      assert.ok(fs.existsSync(path.join(root, "content", "public", "assets", "orphan.png")));
      const metadata = JSON.parse(
        fs.readFileSync(path.join(root, "content", "public", "metadata", "notes.json"), "utf8"),
      );
      assert.equal(metadata.length, 1);
      assert.equal(metadata[0].created, "2026-08-01");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
