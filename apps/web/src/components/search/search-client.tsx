"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SearchDoc } from "@/lib/content";

export function SearchClient({ docs }: { docs: SearchDoc[] }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) {
      return [];
    }
    return docs
      .map((doc) => {
        const haystack = [
          doc.title,
          doc.summary,
          doc.tags.join(" "),
          doc.text,
        ]
          .join(" ")
          .toLowerCase();
        const hits = needle.split(/\s+/).filter((part) => haystack.includes(part)).length;
        return { doc, hits, score: hits / needle.split(/\s+/).length };
      })
      .filter((entry) => entry.hits > 0)
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.doc);
  }, [docs, query]);

  return (
    <div className="search-panel">
      <input
        type="search"
        className="search-input"
        placeholder="搜索标题、摘要、标签与全文……（至少 2 个字符）"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="全站搜索"
      />
      <p className="search-count">
        {query.trim().length < 2
          ? `索引内共 ${docs.length} 篇内容`
          : `${results.length} 个结果`}
      </p>

      {results.length > 0 && (
        <div className="content-index">
          {results.map((doc) => (
            <Link
              key={`${doc.kind}-${doc.slug}`}
              href={`/${doc.kind}/${doc.slug}`}
              className="index-entry"
            >
              <span className="index-entry__number" aria-hidden="true">
                {doc.kind === "gallery" ? "G" : "N"}
              </span>
              <div className="index-entry__body">
                <div className="index-entry__meta">
                  <span>{doc.kind.toUpperCase()}</span>
                  {doc.tags.slice(0, 3).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <h2>{doc.title}</h2>
                {doc.summary && <p>{doc.summary}</p>}
              </div>
              <span className="index-entry__arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
