export type TocItem = {
  id: string;
  text: string;
  level: number;
};

export function extractTocFromHtml(html: string): TocItem[] {
  const toc: TocItem[] = [];
  const headingRegex = /<h([1-6])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h[1-6]>/gi;

  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const id = match[2];
    const text = match[3].replace(/<[^>]*>/g, "").trim();

    if (id && text) {
      toc.push({ id, text, level });
    }
  }

  return toc;
}

export function extractTocFromMarkdown(content: string): TocItem[] {
  const toc: TocItem[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();

      if (id && text) {
        toc.push({ id, text, level });
      }
    }
  }

  return toc;
}
