import { renderMarkdownToHtml } from "@/lib/markdown/pipeline";
import { extractTocFromHtml } from "@/lib/toc";
import type { ReactNode } from "react";
import { demoteMarkdownHeadings } from "./markdown-components";
import { MarkdownContent } from "./markdown-content";

type MarkdownBodyProps = {
  content: string;
  showToc?: boolean;
  sidebarExtra?: ReactNode;
};

export async function MarkdownBody({ content, showToc = true, sidebarExtra }: MarkdownBodyProps) {
  const html = demoteMarkdownHeadings(await renderMarkdownToHtml(content));
  const toc = extractTocFromHtml(html);
  return <MarkdownContent html={html} toc={toc} showToc={showToc} sidebarExtra={sidebarExtra} />;
}
