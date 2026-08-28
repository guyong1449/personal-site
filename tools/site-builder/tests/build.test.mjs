import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  KINDS,
  parseDocument,
  sortByRecency,
  serializeFrontmatter,
} from "../build.mjs";

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
