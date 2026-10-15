import { afterEach, describe, expect, it, vi } from "vitest";
import { getPageViewStats, getLinkClickStats, hasPageViewAdminAccess, incrementPageView, incrementLinkClick } from "../page-views";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("persistent private page views", () => {
  it("fails closed when authentication is missing or incorrect", () => {
    vi.stubEnv("PAGE_VIEWS_ADMIN_TOKEN", "secret");
    expect(hasPageViewAdminAccess(null)).toBe(false);
    expect(hasPageViewAdminAccess("secreu")).toBe(false);
    expect(hasPageViewAdminAccess("secret")).toBe(true);
  });

  it("uses an atomic command without retaining the client IP", async () => {
    vi.stubEnv("PAGE_VIEWS_ADMIN_TOKEN", "secret");
    vi.stubEnv("KV_REST_API_URL", "https://redis.example");
    vi.stubEnv("KV_REST_API_TOKEN", "storage-secret");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ result: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await incrementPageView("/notes/hello-guyong", "192.0.2.1")).toBe(true);
    const options = fetchMock.mock.calls[0][1];
    const command = JSON.parse(options.body);
    expect(command[0]).toBe("EVAL");
    expect(command[1]).toContain("HINCRBY");
    expect(command[1]).toContain("EXPIRE");
    expect(options.body).not.toContain("192.0.2.1");
    expect(options.cache).toBe("no-store");
  });

  it("reports database failure instead of a false successful write", async () => {
    vi.stubEnv("PAGE_VIEWS_ADMIN_TOKEN", "secret");
    vi.stubEnv("KV_REST_API_URL", "https://redis.example");
    vi.stubEnv("KV_REST_API_TOKEN", "storage-secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "quota exceeded" })));
    await expect(incrementPageView("/", "unknown")).rejects.toThrow();
  });

  it("reads persisted counters without creating or resetting a store", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://redis.example");
    vi.stubEnv("KV_REST_API_TOKEN", "storage-secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ result: [
      "total", "12", "path:/notes", "12", "updatedAt", "2026-09-13T00:00:00.000Z",
    ] })));
    expect(await getPageViewStats()).toEqual({ total: 12, byPath: { "/notes": 12 }, updatedAt: "2026-09-13T00:00:00.000Z" });
  });

  it("keeps clicks atomic and separate from page views without storing addresses", async () => {
    vi.stubEnv("PAGE_VIEWS_ADMIN_TOKEN", "secret");
    vi.stubEnv("KV_REST_API_URL", "https://redis.example");
    vi.stubEnv("KV_REST_API_TOKEN", "storage-secret");
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ result: 1 }))
      .mockResolvedValueOnce(Response.json({ result: ["total", "4", "link:research", "4", "updatedAt", "now"] }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await incrementLinkClick("research", "192.0.2.1")).toBe(true);
    const command = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(command[0]).toBe("EVAL");
    expect(command[3]).toBe("guyong:link-clicks:v1");
    expect(command[5]).toBe("link:research");
    expect(JSON.stringify(command)).not.toContain("192.0.2.1");
    expect(await getLinkClickStats()).toEqual({ total: 4, byLink: { research: 4 }, updatedAt: "now" });
  });
});
