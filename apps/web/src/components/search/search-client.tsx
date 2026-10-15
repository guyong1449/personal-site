"use client";

import { displayHeading } from "@/lib/display-heading";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import type { SearchDoc } from "@/lib/content";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramQuery = searchParams.get("q") ?? "";
  const tag = searchParams.get("tag") ?? "";
  const [query, setQuery] = useState(paramQuery);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setQuery(paramQuery);
  }, [paramQuery]);

  // Single CJK characters are meaningful search units, so they skip the
  // two-character minimum that guards latin terms.
  const terms = useMemo(() => tokenizeQuery(query), [query]);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    docs.forEach((doc) => new Set(doc.tags).forEach((value) => {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }));
    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  }, [docs]);
  const results = useMemo(() => searchDocuments(docs, terms, tag), [docs, terms, tag]);

  function updateTag(nextTag: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (query.trim()) nextParams.set("q", query);
    else nextParams.delete("q");
    if (nextTag) nextParams.set("tag", nextTag);
    else nextParams.delete("tag");
    const suffix = nextParams.toString();
    startTransition(() => {
      router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
    });
  }

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    const nextParams = new URLSearchParams(searchParams.toString());
    if (nextQuery.trim()) {
      nextParams.set("q", nextQuery);
    } else {
      nextParams.delete("q");
    }
    const suffix = nextParams.toString();
    startTransition(() => {
      router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
    });
  }

  return (
    <div>
      <label htmlFor="site-search" className="search-label">搜索全文</label>
      <div className="search-control">
        <input
          id="site-search"
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
        {terms.length === 0 && !tag ? `索引内共 ${docs.length} 篇内容` : `${results.length} 个结果`}
        {isPending ? " · 正在更新网址" : ""}
      </p>

      <nav className="tag-filter" aria-label="标签筛选">
        <button type="button" className={!tag ? "is-active" : undefined} aria-pressed={!tag} onClick={() => updateTag("")}>
          全部 {docs.length}
        </button>
        {tags.map(([value, count]) => (
          <button key={value} type="button" className={tag === value ? "is-active" : undefined} aria-pressed={tag === value} onClick={() => updateTag(tag === value ? "" : value)}>
            {value} {count}
          </button>
        ))}
      </nav>

      {(terms.length > 0 || tag) && results.length === 0 && (
        <div className="search-empty" role="status">
          <p>没有找到匹配内容。可以换一个关键词，或选择“全部”取消标签筛选。</p>
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
