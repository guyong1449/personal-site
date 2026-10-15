import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/lib/page-views", () => ({ incrementLinkClick: vi.fn() }));
import { incrementLinkClick } from "@/lib/page-views";
import { POST } from "./route";

beforeEach(() => { vi.mocked(incrementLinkClick).mockResolvedValue(true); });
afterEach(() => { vi.resetAllMocks(); });
function request(body: string, headers = {}) {
  return new NextRequest("https://guyong.site/api/link-clicks", {
    method: "POST", headers: { origin: "https://guyong.site", ...headers }, body,
  });
}
it("records registered destinations without exposing counters", async () => {
  const response = await POST(request('{"id":"dkucc-skill"}', { "x-vercel-forwarded-for": "192.0.2.1" }));
  expect(response.status).toBe(204);
  expect(await response.text()).toBe("");
  expect(incrementLinkClick).toHaveBeenCalledWith("dkucc-skill", "192.0.2.1");
});
it("rejects cross-site, unknown destinations and malformed or oversized input", async () => {
  expect((await POST(request('{"id":"research"}', { origin: "https://other.example" }))).status).toBe(403);
  for (const body of ['{"id":"https://evil.example"}', '{', 'null']) {
    expect((await POST(request(body))).status).toBe(400);
  }
  expect((await POST(request("x".repeat(1025)))).status).toBe(413);
  expect(incrementLinkClick).not.toHaveBeenCalled();
});
it("excludes owner clicks without changing persisted totals", async () => {
  expect((await POST(request('{"id":"research"}', { cookie: "guyong-analytics-exclude=1" }))).status).toBe(204);
  expect(incrementLinkClick).not.toHaveBeenCalled();
});
it("reports throttling and storage failures", async () => {
  vi.mocked(incrementLinkClick).mockResolvedValueOnce(false);
  expect((await POST(request('{"id":"research"}'))).status).toBe(429);
  vi.mocked(incrementLinkClick).mockRejectedValueOnce(new Error("offline"));
  expect((await POST(request('{"id":"research"}'))).status).toBe(503);
});
