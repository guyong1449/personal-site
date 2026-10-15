import { afterEach, describe, expect, it, vi } from "vitest";
import { getPageViewStats, hasPageViewAdminAccess, incrementPageView } from "../page-views";

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
});
