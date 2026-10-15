import type { ReactNode } from "react";
import type { TocItem } from "@/lib/toc";
import { Toc } from "./toc";
import { ArticleProse } from "./article-prose";

export function MarkdownContent({ html, toc, showToc = true, sidebarExtra }: {
  html: string; toc: TocItem[]; showToc?: boolean; sidebarExtra?: ReactNode;
}) {
  const hasSidebar = (showToc && toc.length > 0) || Boolean(sidebarExtra);
  return (
    <div className="flex gap-16">
      <ArticleProse html={html} />
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
