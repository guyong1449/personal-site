import { describe, expect, it } from "vitest";
import { demoteMarkdownHeadings } from "../markdown-components";

describe("MarkdownBody heading structure", () => {
  it("keeps the page title as the only h1 by demoting body h1 headings", () => {
    const html = '<h1 id="body-title">正文标题</h1><h2 id="section">章节</h2>';

    const result = demoteMarkdownHeadings(html);

    expect(result).not.toContain("<h1");
    expect(result).toContain('<h2 id="body-title">正文标题</h2>');
    expect(result).toContain('<h2 id="section">章节</h2>');
  });
});
