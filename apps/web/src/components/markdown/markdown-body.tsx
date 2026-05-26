import { renderMarkdownToHtml } from "@/lib/markdown/pipeline";
import { extractTocFromHtml } from "@/lib/toc";
import { Toc } from "./toc";

type MarkdownBodyProps = {
  content: string;
  showToc?: boolean;
};

export async function MarkdownBody({ content, showToc = true }: MarkdownBodyProps) {
  const html = await renderMarkdownToHtml(content);
  const toc = extractTocFromHtml(html);

  return (
    <div className="flex gap-8">
      <article
        className="prose prose-lg max-w-none flex-1"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {showToc && toc.length > 0 && (
        <aside className="hidden w-64 shrink-0 lg:block">
          <Toc items={toc} />
        </aside>
      )}
    </div>
  );
}
