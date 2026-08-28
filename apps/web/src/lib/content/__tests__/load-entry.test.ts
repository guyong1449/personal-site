import fs from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadEntry } from "../load-entry";

const metadata = JSON.stringify([
  {
    title: "Fixture Note",
    slug: "fixture-note",
    summary: "Fixture summary",
    tags: ["fixture/test"]
  }
]);

const document = `---
title: "Frontmatter Title"
slug: "frontmatter-slug"
summary: "Frontmatter summary"
tags:
  - frontmatter/tag
content_type: "note"
---
Fixture body.`;

function mockContentFiles(documentResult: string | NodeJS.ErrnoException = document) {
  vi.spyOn(fs, "readFile").mockImplementation(async (filePath) => {
    const target = String(filePath).replace(/\\/g, "/");
    if (target.endsWith("/metadata/notes.json")) return metadata;
    if (target.endsWith("/notes/fixture-note.md")) {
      if (documentResult instanceof Error) throw documentResult;
      return documentResult;
    }
    throw new Error(`Unexpected test path: ${target}`);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadEntry", () => {
  it("loads a known note document", async () => {
    mockContentFiles();

    const note = await loadEntry("notes", "fixture-note");

    expect(note).not.toBeNull();
    expect(note?.slug).toBe("fixture-note");
    expect(note?.contentType).toBe("note");
    expect(note?.body).toContain("Fixture body");
  });

  it("returns null for an unknown slug", async () => {
    mockContentFiles();

    await expect(loadEntry("notes", "missing-slug")).resolves.toBeNull();
  });

  it("prefers metadata fields over markdown frontmatter duplicates", async () => {
    mockContentFiles();

    const note = await loadEntry("notes", "fixture-note");

    expect(note).not.toBeNull();
    expect(note?.title).toBe("Fixture Note");
    expect(note?.summary).toBe("Fixture summary");
    expect(note?.tags).toEqual(["fixture/test"]);
    expect(note?.slug).toBe("fixture-note");
  });

  it("returns null when metadata exists but the markdown file is missing", async () => {
    const error = new Error("missing document") as NodeJS.ErrnoException;
    error.code = "ENOENT";
    mockContentFiles(error);

    await expect(loadEntry("notes", "fixture-note")).resolves.toBeNull();
  });
});
