import { describe, expect, it } from "vitest";
import { renderMarkdownToHtml } from "../pipeline";

describe("markdown pipeline", () => {
  it("renders safe image widths and preserves ordinary image captions", async () => {
    const html = await renderMarkdownToHtml('![截图](assets/screen.png "说明 | width=480px")\n\n![比例](assets/percent.png "width=65%")');
    expect(html).toContain('src="/assets/screen.png"');
    expect(html).toContain('title="说明"');
    expect(html).toContain('style="width:480px"');
    expect(html).toContain('style="width:65%"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-label="放大图片：截图"');
    expect(html).not.toContain('title="width=65%"');
  });

  it("rejects unbounded sizes and arbitrary image CSS", async () => {
    for (const title of ["width=0%", "width=101%", "width=9999px", "width=100%;position:fixed", "width=12px"]) {
      const html = await renderMarkdownToHtml(`![截图](assets/screen.png "${title}")`);
      expect(html).not.toContain("style=");
    }
  });
  it("resolves article-local asset images from the public root", async () => {
    const html = await renderMarkdownToHtml("![截图](assets/dkucc-image-706.png)\n\n![远程](https://example.com/image.png)");
    expect(html).toContain('src="/assets/dkucc-image-706.png"');
    expect(html).toContain('src="https://example.com/image.png"');
  });
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
