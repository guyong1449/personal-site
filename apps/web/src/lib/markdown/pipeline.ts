import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";

// Rendering contract: raw HTML in Markdown is treated as plain text, never
// interpreted. The Studio preview follows the same rule, so what an author
// sees while editing is exactly what ships.
export function createMarkdownProcessor() {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeHighlight)
    .use(rehypeKatex)
    .use(rehypeStringify);
}

export async function renderMarkdownToHtml(content: string): Promise<string> {
  const processor = createMarkdownProcessor();
  const result = await processor.process(content);
  return String(result);
}
