import { describe, expect, it } from "vitest";
import { renderMarkdownToHtml } from "../pipeline";

describe("markdown pipeline", () => {
  it("identifies draft images by source offset without exposing editor metadata in published HTML", async () => {
    const body = '`![代码](code.png)`\n\n![第一张](assets/one.png)\n\n![第二张](assets/two.png "width=40%")';
    const html = await renderMarkdownToHtml(body, true);
    expect(html).toContain(`data-studio-start="${body.indexOf("![第一张]")}"`);
    expect(html).toContain(`data-studio-start="${body.indexOf("![第二张]")}"`);
    expect(html.match(/data-studio-start=/g)).toHaveLength(2);
    expect(await renderMarkdownToHtml(body)).not.toContain("data-studio-start");
  });
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
  it("embeds allowlisted music and video provider links", async () => {
    const output = (await renderMarkdownToHtml([
      "https://music.163.com/song?id=36387916&userid=1",
      "",
      "https://www.bilibili.com/video/BV1GJ411x7h7",
      "",
      "https://youtu.be/dQw4w9WgXcQ",
      "",
      "[歌单](https://music.163.com/playlist?id=7353837379)",
    ].join("\n"))).replace(/&#x26;/g, "&");
    expect(output).toContain('src="https://music.163.com/outchain/player?type=2&id=36387916&auto=1&height=66"');
    expect(output).toContain('src="https://player.bilibili.com/player.html?bvid=BV1GJ411x7h7&autoplay=0"');
    expect(output).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(output).toContain('type=0&id=7353837379');
    expect(output.match(/<iframe/g)).toHaveLength(4);
  });
  it("leaves mixed-paragraph and non-provider links untouched", async () => {
    const html = await renderMarkdownToHtml("看这个 https://music.163.com/song?id=1\n\n[例站](https://example.com)\n\nhttps://example.com/page");
    expect(html).not.toContain("<iframe");
    expect(html).toContain('href="https://music.163.com/song?id=1"');
    expect(html).toContain('href="https://example.com"');
  });
  it("converts media-file images into audio and video players", async () => {
    const html = await renderMarkdownToHtml('![录音](assets/talk.mp3)\n\n![视频](assets/clip.mp4)\n\n![远程](https://cdn.example.com/a.webm)\n\n![拒绝](assets/hack.mp4 "width=101%")');
    expect(html).toContain('<audio src="/assets/talk.mp3"');
    expect(html).toContain('<video src="/assets/clip.mp4"');
    expect(html).toContain('src="https://cdn.example.com/a.webm"');
    expect(html).not.toContain('style="width:101%"');
  });
  it("sizes and aligns embeds through the title suffix", async () => {
    const html = await renderMarkdownToHtml('[视频](https://www.bilibili.com/video/BV1GJ411x7h7 "介绍 | width=60%")\n\n![居中](assets/a.png "width=60% | align=center")\n\n![右](assets/b.png "align=right")');
    expect(html).toContain('style="width:60%"');
    expect(html).toContain('title="介绍"');
    expect(html).toContain('style="width:60%;margin:1.3em auto"');
    expect(html).toContain('style="margin:1.3em 0 1.3em auto"');
  });
  it("groups adjacent images in one paragraph into a shared row", async () => {
    const html = await renderMarkdownToHtml("![一](assets/a.png)\n\n![二](assets/b.png) ![三](assets/c.png)");
    expect(html.match(/class="img-row"/g)).toHaveLength(1);
    const row = html.slice(html.indexOf('class="img-row"'));
    expect(row).toContain("b.png");
    expect(row).toContain("c.png");
  });
  it("opens off-site article links in a new tab while keeping site links inline", async () => {
    const html = await renderMarkdownToHtml("[外站](https://example.com/a)\n\n[站内](/notes)\n\n[本站](https://guyong.site/notes/x)");
    expect(html).toContain('href="https://example.com/a" target="_blank" rel="noopener noreferrer"');
    expect(html).toContain('<a href="/notes">站内</a>');
    expect(html).toContain('href="https://guyong.site/notes/x"');
    expect(html).not.toContain('href="https://guyong.site/notes/x" target="_blank"');
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
