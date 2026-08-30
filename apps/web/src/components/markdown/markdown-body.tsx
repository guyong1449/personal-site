import { renderMarkdownToHtml } from "@/lib/markdown/pipeline";
import { extractTocFromHtml } from "@/lib/toc";
import type { ReactNode } from "react";
import { demoteMarkdownHeadings } from "./markdown-components";
import { Toc } from "./toc";

type MarkdownBodyProps = {
  content: string;
  showToc?: boolean;
  sidebarExtra?: ReactNode;
};

export async function MarkdownBody({ content, showToc = true, sidebarExtra }: MarkdownBodyProps) {
  const html = demoteMarkdownHeadings(await renderMarkdownToHtml(content));
  const toc = extractTocFromHtml(html);
  const hasSidebar = (showToc && toc.length > 0) || Boolean(sidebarExtra);

  return (
    <div className="flex gap-16">
      <article
        className="prose prose-lg max-w-none min-w-0 flex-1"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {hasSidebar && (
        <aside className="article-sidebar hidden w-52 shrink-0 lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto">
            {showToc && toc.length > 0 && <Toc items={toc} />}
            {sidebarExtra}
          </div>
        </aside>
      )}
    </div>
  );
}
