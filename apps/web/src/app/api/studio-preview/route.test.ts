import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

afterEach(() => vi.unstubAllEnvs());
const request = (body: unknown, origin = "http://127.0.0.1:4317") => new NextRequest("http://127.0.0.1:4317/api/studio-preview", {
  method: "POST", headers: { origin }, body: JSON.stringify(body),
});

it("keeps the draft renderer unavailable in production and to foreign origins", async () => {
  vi.stubEnv("NODE_ENV", "production");
  expect((await POST(request({ body: "draft" }))).status).toBe(404);
  vi.stubEnv("NODE_ENV", "development");
  expect((await POST(request({ body: "draft" }, "https://foreign.example"))).status).toBe(403);
});

it("renders drafts with the public Markdown pipeline and rejects invalid input", async () => {
  vi.stubEnv("NODE_ENV", "development");
  const response = await POST(request({ body: "# 标题\n\n$x^2$\n\n<script>alert(1)</script>" }));
  const rendered = await response.json();
  expect(rendered.html).toContain("<h2");
  expect(rendered.html).toContain('class="katex"');
  expect(rendered.html).not.toContain("<script>");
  expect(rendered.toc[0].text).toBe("标题");
  expect((await POST(request({ body: 42 }))).status).toBe(400);
  expect((await POST(request({ body: "x".repeat(2_000_001) }))).status).toBe(413);
});
