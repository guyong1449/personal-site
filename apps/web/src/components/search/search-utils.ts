import type { SearchDoc } from "@/lib/content";

export type HighlightPart = {
  text: string;
  highlighted: boolean;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function tokenizeQuery(query: string) {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length >= 2 || /[\u4e00-\u9fff]/.test(term));
}

export function searchDocuments(docs: SearchDoc[], terms: string[]) {
  if (terms.length === 0) {
    return [];
  }

  return docs
    .map((doc) => {
      const haystack = [doc.title, doc.summary, doc.tags.join(" "), doc.text]
        .join(" ")
        .toLowerCase();
      const hits = terms.filter((term) => haystack.includes(term)).length;
      return { doc, score: hits / terms.length };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.doc);
}

export function splitHighlights(text: string, terms: string[]): HighlightPart[] {
  if (terms.length === 0) {
    return [{ text, highlighted: false }];
  }

  const source = terms.map(escapeRegExp).join("|");
  const splitPattern = new RegExp(`(${source})`, "gi");
  const exactPattern = new RegExp(`^(?:${source})$`, "i");

  return text
    .split(splitPattern)
    .filter(Boolean)
    .map((part) => ({ text: part, highlighted: exactPattern.test(part) }));
}

export function snippetFor(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  let position = -1;
  for (const term of terms) {
    position = lower.indexOf(term);
    if (position >= 0) {
      break;
    }
  }
  if (position < 0) {
    return null;
  }

  const start = Math.max(0, position - 40);
  const end = Math.min(text.length, position + 120);
  return (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
}
