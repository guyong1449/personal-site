import { describe, expect, it } from "vitest";
import sitemap from "../sitemap";

describe("sitemap", () => {
  it("keeps static route dates stable and uses content dates for details", async () => {
    const routes = await sitemap();
    const home = routes.find((route) => route.url === "https://guyong.site");
    const note = routes.find((route) => route.url.includes("/notes/hello-guyong"));

    expect(home).not.toHaveProperty("lastModified");
    expect(note?.lastModified).toEqual(new Date("2026-08-29"));
  });
});
