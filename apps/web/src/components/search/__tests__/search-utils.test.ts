import { describe, expect, it } from "vitest";
import type { SearchDoc } from "@/lib/content";
import {
  searchDocuments,
  snippetFor,
  splitHighlights,
  tokenizeQuery,
} from "../search-utils";

const docs: SearchDoc[] = [
  {
    kind: "notes",
    slug: "alpha",
    title: "算法学习",
    summary: "Graph notes",
    tags: ["course/CS308"],
    text: "图论与 shortest path 的整理。",
  },
  {
    kind: "gallery",
    slug: "beta",
    title: "Blue study",
    summary: "A quiet sketch",
    tags: ["sketch"],
    text: "blue blue lines",
  },
];

describe("search helpers", () => {
  it("accepts one CJK character but rejects one latin character", () => {
    expect(tokenizeQuery("图")).toEqual(["图"]);
    expect(tokenizeQuery("a")).toEqual([]);
    expect(tokenizeQuery("alpha 图")).toEqual(["alpha", "图"]);
  });

  it("ranks documents matching more query terms first", () => {
    const results = searchDocuments(docs, ["blue", "sketch"]);
    expect(results.map((doc) => doc.slug)).toEqual(["beta"]);
  });

  it("marks every repeated match without RegExp state leaks", () => {
    expect(splitHighlights("blue blue", ["blue"])).toEqual([
      { text: "blue", highlighted: true },
      { text: " ", highlighted: false },
      { text: "blue", highlighted: true },
    ]);
  });

  it("returns an excerpt around the first full-text match", () => {
    expect(snippetFor("prefix graph suffix", ["graph"])).toBe("prefix graph suffix");
    expect(snippetFor("no match", ["graph"])).toBeNull();
  });
});
