import fs from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadEntry } from "../load-entry";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadEntry", () => {
  it("loads a known note document", async () => {
    const note = await loadEntry("notes", "dku-duo-push");

    expect(note).not.toBeNull();
    expect(note?.slug).toBe("dku-duo-push");
    expect(note?.contentType).toBe("note");
    expect(note?.body.length).toBeGreaterThan(0);
  });

  it("returns null for an unknown slug", async () => {
    const note = await loadEntry("notes", "missing-slug");

    expect(note).toBeNull();
  });

  it("prefers metadata fields over markdown frontmatter duplicates", async () => {
    const readFileSpy = vi.spyOn(fs, "readFile");

    readFileSpy.mockImplementation(async (path, options) => {
      const target = String(path).replace(/\\/g, "/");
      if (target.endsWith("/notes/dku-duo-push.md")) {
        return `---
title: "Conflicting Frontmatter Title"
slug: "conflicting-frontmatter-slug"
summary: "Conflicting frontmatter summary"
tags:
  - conflicting/tag
content_type: "note"
---
Body from mocked markdown.` as never;
      }

      return (await vi.importActual<typeof fs>("node:fs/promises")).readFile(
        path,
        options as never,
      );
    });

    const note = await loadEntry("notes", "dku-duo-push");

    expect(note).not.toBeNull();
    expect(note?.title).toBe("DKU Duo Push 设备换绑流程");
    expect(note?.summary).toBe(
      "DKU Duo Push 设备换绑、跨系统迁移、以及无法登录 MFA 时的恢复流程整理。",
    );
    expect(note?.tags).toEqual(["area/research", "focus/pace", "type/reference"]);
    expect(note?.slug).toBe("dku-duo-push");
  });

  it("returns null when metadata exists but the markdown file is missing", async () => {
    const readFileSpy = vi.spyOn(fs, "readFile");

    readFileSpy.mockImplementation(async (path, options) => {
      const target = String(path).replace(/\\/g, "/");
      if (target.endsWith("/notes/dku-duo-push.md")) {
        const error = new Error("missing document") as NodeJS.ErrnoException;
        error.code = "ENOENT";
        throw error;
      }

      return (await vi.importActual<typeof fs>("node:fs/promises")).readFile(
        path,
        options as never,
      );
    });

    await expect(loadEntry("notes", "dku-duo-push")).resolves.toBeNull();
  });
});
