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
  it("combines independent themes, multiple tags and full-text search", () => {
    const entries: SearchDoc[] = [
      { ...docs[0], topics: ["课程", "CS"], tags: ["course/CS308", "topic/algorithm"] },
      { ...docs[1], topics: ["生活"], tags: ["topic/algorithm"] },
    ];
    const filters = new URLSearchParams("topic=CS&tag=course%2FCS308&tag=topic%2Falgorithm");
    expect(searchDocuments(entries, [], filters)).toEqual([entries[0]]);
    expect(searchDocuments(entries, ["graph"], filters)).toEqual([entries[0]]);
    expect(searchDocuments(entries, ["blue"], filters)).toEqual([]);
    expect(searchDocuments(entries, [], new URLSearchParams("topic=生活&topic=CS"))).toEqual(entries);
    expect(searchDocuments(entries, ["cs"])).toEqual([entries[0]]);
  });
  it("browses an exact tag without requiring a query", () => {
    expect(searchDocuments(docs, [], "course/CS308")).toEqual([docs[0]]);
    expect(searchDocuments(docs, [], "course")).toEqual([]);
    expect(searchDocuments(docs, [], "missing")).toEqual([]);
    expect(searchDocuments(docs, [])).toEqual([]);
  });

  it("combines tag and keyword filters", () => {
    expect(searchDocuments(docs, ["blue"], "sketch")).toEqual([docs[1]]);
    expect(searchDocuments(docs, ["blue"], "course/CS308")).toEqual([]);
    expect(searchDocuments(docs, ["cs308"])).toEqual([docs[0]]);
  });

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
