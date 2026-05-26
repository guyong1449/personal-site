import { describe, expect, it } from "vitest";
import { getDocumentPath, getMetadataPath, getPublicRoot } from "../paths";

describe("content paths", () => {
  it("resolves the generated public root", () => {
    expect(getPublicRoot().replace(/\\/g, "/")).toContain("/content/public");
  });

  it("builds metadata paths by kind", () => {
    expect(getMetadataPath("notes").replace(/\\/g, "/")).toMatch(/metadata\/notes\.json$/);
  });

  it("builds document paths by kind and slug", () => {
    expect(getDocumentPath("notes", "dku-duo-push").replace(/\\/g, "/")).toMatch(
      /notes\/dku-duo-push\.md$/,
    );
  });
});
