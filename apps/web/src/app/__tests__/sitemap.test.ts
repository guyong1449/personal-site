import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/content", () => ({
  loadIndex: vi.fn(async (kind: string) => kind === "notes" ? [{ slug: "dated-note", updated: "2026-08-29", created: "2026-08-01" }] : []),
}));
import sitemap from "../sitemap";

describe("sitemap", () => {
  it("keeps static route dates stable and uses content dates for details", async () => {
    const routes = await sitemap();
    const home = routes.find((route) => route.url === "https://guyong.site");
    const note = routes.find((route) => route.url.includes("/notes/dated-note"));

    expect(home).not.toHaveProperty("lastModified");
    expect(note?.lastModified).toEqual(new Date("2026-08-29"));
  });
});
