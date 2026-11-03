import type { ReactNode } from "react";
import type { TocItem } from "@/lib/toc";
import { Toc } from "./toc";
import { ArticleProse } from "./article-prose";

export function MarkdownContent({ html, toc, showToc = true, sidebarExtra }: {
  html: string; toc: TocItem[]; showToc?: boolean; sidebarExtra?: ReactNode;
}) {
  const hasSidebar = (showToc && toc.length > 0) || Boolean(sidebarExtra);
  return (
    <div className="article-content">
      <ArticleProse html={html} />
      {hasSidebar && (
        <aside className="article-sidebar">
          <div className="article-sidebar__inner">
            {showToc && toc.length > 0 && <Toc items={toc} />}
            {sidebarExtra}
          </div>
        </aside>
      )}
    </div>
  );
}
