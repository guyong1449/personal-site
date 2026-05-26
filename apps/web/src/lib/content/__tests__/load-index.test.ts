import { describe, expect, it } from "vitest";
import { loadIndex } from "../load-index";

describe("loadIndex", () => {
  it("loads exported notes metadata", async () => {
    const notes = await loadIndex("notes");

    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0]).toMatchObject({
      kind: "notes",
      slug: "dku-duo-push",
    });
  });

  it("returns an empty array for empty metadata exports", async () => {
    await expect(loadIndex("courses")).resolves.toEqual([]);
    await expect(loadIndex("gallery")).resolves.toEqual([]);
  });
});
