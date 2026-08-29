import { describe, expect, it } from "vitest";
import { renderMarkdownToHtml } from "../pipeline";

describe("markdown pipeline", () => {
  it("never emits raw author HTML", async () => {
    const html = await renderMarkdownToHtml(
      "hello\n\n<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\nworld",
    );

    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("onerror");
    expect(html).toContain("hello");
    expect(html).toContain("world");
  });

  it("still renders headings, lists, code, and links", async () => {
    const html = await renderMarkdownToHtml(
      "# 标题\n\n- 项目\n\n```js\nconst x = 1;\n```\n\n[链接](https://example.com)",
    );

    expect(html).toContain("<h1");
    expect(html).toContain("<ul>");
    expect(html).toContain("<pre");
    expect(html).toContain('href="https://example.com"');
  });
});
