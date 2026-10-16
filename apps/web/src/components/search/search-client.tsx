"use client";

import { displayHeading } from "@/lib/display-heading";
import Link from "next/link";
import { useMemo } from "react";
import type { ReactNode } from "react";
import type { SearchDoc } from "@/lib/content";
import { ContentFilters } from "@/components/content/content-filters";
import { useContentFilterParams } from "@/components/content/use-content-filter-params";
import { contentFilterKeys, selectedFilterValues } from "@/lib/content-filters";
import {
  searchDocuments,
  snippetFor,
  splitHighlights,
  tokenizeQuery,
} from "./search-utils";

// Split text around matched terms so hits can be highlighted with <mark>.
function highlight(text: string, terms: string[]): ReactNode {
  return splitHighlights(text, terms).map((part, index) =>
    part.highlighted ? (
      <mark key={`${part.text}-${index}`}>{part.text}</mark>
    ) : (
      <span key={`${part.text}-${index}`}>{part.text}</span>
    ),
  );
}

export function SearchClient({ docs }: { docs: SearchDoc[] }) {
  const { params, updateParams, isPending } = useContentFilterParams();
  const query = params.get("q") ?? "";
  const hasFilters = contentFilterKeys.some((key) => selectedFilterValues(params, key).length > 0);

  // Single CJK characters are meaningful search units, so they skip the
  // two-character minimum that guards latin terms.
  const terms = useMemo(() => tokenizeQuery(query), [query]);

  const results = searchDocuments(docs, terms, params);

  function updateQuery(nextQuery: string) {
    updateParams((next) => {
      if (nextQuery) next.set("q", nextQuery);
      else next.delete("q");
    });
  }

  return (
    <div>
      <div className="search-control">
        <input
          id="site-search"
          aria-label="搜索"
          type="search"
          className="search-input"
          placeholder="输入一个中文字符，或至少两个拉丁字母"
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          aria-describedby="search-status"
        />
        {query && (
          <button type="button" className="search-clear" onClick={() => updateQuery("")}>
            清除
          </button>
        )}
      </div>
      <p id="search-status" className="search-count" aria-live="polite">
        {terms.length === 0 && !hasFilters ? `共 ${docs.length} 篇内容` : `${results.length} 个结果`}
        {isPending ? " · 正在更新网址" : ""}
      </p>

      <ContentFilters items={docs} params={params} onChange={updateParams} />

      {(terms.length > 0 || hasFilters) && results.length === 0 && (
        <div className="search-empty" role="status">
          <p>没有找到匹配内容。可以换一个关键词，或移除部分主题、标签。</p>
          <button type="button" className="search-clear" onClick={() => updateQuery("")}>
            清除搜索
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div className="content-index">
          {results.map((doc) => (
            <Link
              key={`${doc.kind}-${doc.slug}`}
              href={`/${doc.kind}/${doc.slug}`}
              className="index-entry"
            >
              <div className="index-entry__body">
                <h2>{highlight(displayHeading(doc.title), terms)}</h2>
                {doc.summary && <p>{highlight(doc.summary, terms)}</p>}
                {(() => {
                  const snippet = snippetFor(doc.text, terms);
                  return snippet ? (
                    <p className="search-snippet">{highlight(snippet, terms)}</p>
                  ) : null;
                })()}
              </div>
              <span className="index-entry__arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
