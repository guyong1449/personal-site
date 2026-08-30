import { describe, expect, it } from "vitest";
import { isNavItemActive } from "../nav-data";

describe("main navigation active state", () => {
  it("matches both a section page and its detail pages", () => {
    expect(isNavItemActive("/notes", "/notes")).toBe(true);
    expect(isNavItemActive("/notes/hello-guyong", "/notes")).toBe(true);
    expect(isNavItemActive("/gallery", "/notes")).toBe(false);
    expect(isNavItemActive("/notebook", "/notes")).toBe(false);
  });
});
