import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractSummary,
  extractTitle,
  parseFrontmatter,
  serializeFrontmatter,
  slugify,
} from "../lib.js";

describe("slugify", () => {
  it("keeps ascii slugs stable", () => {
    assert.equal(slugify("Hello World 2"), "hello-world-2");
    assert.equal(slugify("  already-slug--here  "), "already-slug-here");
  });

  it("falls back to a timestamped slug for CJK titles", () => {
    const slug = slugify("算法笔记", "note", Date.UTC(2026, 7, 28, 0, 0, 0));
    assert.match(slug, /^note-\d{14}$/);
  });

  it("falls back when ascii output is too short", () => {
    assert.match(slugify("算法 a", "note"), /^note-\d{14}$/);
  });
});

describe("extractTitle / extractSummary", () => {
  it("takes the first heading as title", () => {
    assert.equal(extractTitle("intro\n\n# 标题\n\ntext"), "标题");
    assert.equal(extractTitle("no heading"), null);
  });

  it("takes the first non-heading paragraph as summary and truncates", () => {
    assert.equal(extractSummary("# H\n\n第一段摘要。"), "第一段摘要。");
    const long = extractSummary("字".repeat(200));
    assert.equal(long.length, 120);
    assert.ok(long.endsWith("…"));
  });
});

describe("frontmatter", () => {
  it("round-trips fields and drops empty ones", () => {
    const source = serializeFrontmatter(
      {
        title: "T",
        slug: "t",
        status: "draft",
        tags: ["a/b"],
        cover: null,
        summary: "",
        pinned: true,
      },
      "Body text",
    );
    const parsed = parseFrontmatter(source);

    assert.equal(parsed.frontmatter.title, "T");
    assert.equal(parsed.frontmatter.status, "draft");
    assert.deepEqual(parsed.frontmatter.tags, ["a/b"]);
    assert.ok(!("cover" in parsed.frontmatter));
    assert.ok(!("summary" in parsed.frontmatter));
    assert.equal(parsed.frontmatter.pinned, true);
    assert.equal(parsed.body.trim(), "Body text");
  });

  it("handles documents without frontmatter", () => {
    const parsed = parseFrontmatter("plain body");
    assert.deepEqual(parsed.frontmatter, {});
    assert.equal(parsed.body, "plain body");
  });
});
