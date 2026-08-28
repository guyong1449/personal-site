import fs from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadIndex } from "../load-index";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadIndex", () => {
  it("loads and normalizes exported notes metadata", async () => {
    vi.spyOn(fs, "readFile").mockResolvedValue(
      JSON.stringify([
        {
          title: "Fixture Note",
          slug: "fixture-note",
          summary: "Fixture summary",
          tags: ["fixture/test"]
        }
      ])
    );

    const notes = await loadIndex("notes");

    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({
      kind: "notes",
      slug: "fixture-note",
      title: "Fixture Note"
    });
  });

  it("returns an empty array for empty metadata exports", async () => {
    vi.spyOn(fs, "readFile").mockResolvedValue("[]");

    await expect(loadIndex("courses")).resolves.toEqual([]);
    await expect(loadIndex("gallery")).resolves.toEqual([]);
  });
});
