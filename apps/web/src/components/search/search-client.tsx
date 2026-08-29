"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { SearchDoc } from "@/lib/content";

// Split text around matched terms so hits can be highlighted with <mark>.
function highlight(text: string, terms: string[]): ReactNode {
  if (terms.length === 0) {
    return text;
  }
  const pattern = new RegExp(
    `(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi",
  );
  return text.split(pattern).map((part, index) =>
    pattern.test(part) ? <mark key={index}>{part}</mark> : <span key={index}>{part}</span>,
  );
}

export function SearchClient({ docs }: { docs: SearchDoc[] }) {
  const [query, setQuery] = useState("");

  // Single CJK characters are meaningful search units, so they skip the
  // two-character minimum that guards latin terms.
  const terms = useMemo(
    () =>
      query
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter((term) => term.length >= 2 || /[\u4e00-\u9fff]/.test(term)),
    [query],
  );

  const results = useMemo(() => {
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
  }, [docs, terms]);

  return (
    <div>
      <input
        type="search"
        className="search-input"
        placeholder="搜索标题、摘要、标签与全文……（至少 2 个字符）"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="全站搜索"
      />
      <p className="search-count">
        {terms.length === 0 ? `索引内共 ${docs.length} 篇内容` : `${results.length} 个结果`}
      </p>

      {results.length > 0 && (
        <div className="content-index">
          {results.map((doc) => (
            <Link
              key={`${doc.kind}-${doc.slug}`}
              href={`/${doc.kind}/${doc.slug}`}
              className="index-entry"
            >
              <div className="index-entry__body">
                <h2>{highlight(doc.title, terms)}</h2>
                {doc.summary && <p>{highlight(doc.summary, terms)}</p>}
              </div>
              <span className="index-entry__arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
