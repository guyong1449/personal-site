import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/lib/content", () => ({ loadIndex: vi.fn().mockResolvedValue([{ slug: "hello-guyong" }]) }));
vi.mock("@/lib/page-views", () => ({ incrementPageView: vi.fn(), getPageViewStats: vi.fn(), hasPageViewAdminAccess: vi.fn() }));
import { incrementPageView, getPageViewStats, hasPageViewAdminAccess } from "@/lib/page-views";
import { loadIndex } from "@/lib/content";
import { POST } from "./route";
import { GET } from "../admin/page-views/route";

beforeEach(() => {
  vi.mocked(incrementPageView).mockResolvedValue(true);
  vi.mocked(loadIndex).mockResolvedValue([{ slug: "hello-guyong" }] as Awaited<ReturnType<typeof loadIndex>>);
});
afterEach(() => { vi.resetAllMocks(); });
function request(pathname: string, origin = "https://guyong.site") {
  return new NextRequest("https://guyong.site/api/page-views", {
    method: "POST", headers: { origin }, body: JSON.stringify({ pathname }),
  });
}
it("rejects cross-origin and unpublished/admin paths without writing", async () => {
  expect((await POST(request("/", "https://other.example"))).status).toBe(403);
  for (const value of ["/admin/page-views", "/notes/private", "/notes?token=secret", "/".repeat(201)]) {
    expect((await POST(request(value))).status).toBe(400);
  }
  expect(incrementPageView).not.toHaveBeenCalled();
});
it("does not expose a counter in the public write response", async () => {
  const response = await POST(request("/notes/hello-guyong"));
  expect(response.status).toBe(204);
  expect(await response.text()).toBe("");
});
it("returns rate-limit and storage-failure statuses", async () => {
  vi.mocked(incrementPageView).mockResolvedValueOnce(false);
  expect((await POST(request("/"))).status).toBe(429);
  vi.mocked(incrementPageView).mockRejectedValueOnce(new Error("offline"));
  expect((await POST(request("/"))).status).toBe(503);
});
it("does not read statistics without a header token, including query tokens", async () => {
  vi.mocked(hasPageViewAdminAccess).mockReturnValue(false);
  const response = await GET(new NextRequest("https://guyong.site/api/admin/page-views?token=secret"));
  expect(response.status).toBe(404);
  expect(hasPageViewAdminAccess).toHaveBeenCalledWith(null);
  expect(getPageViewStats).not.toHaveBeenCalled();
});
it("only returns private uncached statistics after authentication", async () => {
  vi.mocked(hasPageViewAdminAccess).mockReturnValue(true);
  vi.mocked(getPageViewStats).mockResolvedValue({ total: 2, byPath: { "/": 2 }, updatedAt: "now" });
  const response = await GET(new NextRequest("https://guyong.site/api/admin/page-views", { headers: { "x-admin-token": "secret" } }));
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect((await response.json()).total).toBe(2);
});
