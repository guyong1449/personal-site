"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ContentListItem } from "@/lib/content";

// Client-side tag filter for list pages: chips row + the shared index rows.
// The active tag also syncs with ?tag=… so article tag links deep-link here.
export function FilterableIndex({
  items,
  emptyMessage,
}: {
  items: ContentListItem[];
  emptyMessage: string;
}) {
  const searchParams = useSearchParams();
  const paramTag = searchParams.get("tag");
  const [active, setActive] = useState<string | null>(paramTag);

  useEffect(() => {
    setActive(paramTag);
  }, [paramTag]);

  const tags = useMemo(() => {
    const counter = new Map<string, number>();
    for (const item of items) {
      for (const tag of item.tags) {
        counter.set(tag, (counter.get(tag) ?? 0) + 1);
      }
    }
    return [...counter.entries()].sort((left, right) => right[1] - left[1]);
  }, [items]);

  const visible = active ? items.filter((item) => item.tags.includes(active)) : items;

  return (
    <div>
      {tags.length > 0 && (
        <nav className="tag-filter" aria-label="标签筛选">
          <button
            type="button"
            className={active === null ? "is-active" : undefined}
            onClick={() => setActive(null)}
          >
            全部 {items.length}
          </button>
          {tags.map(([tag, count]) => (
            <button
              key={tag}
              type="button"
              className={active === tag ? "is-active" : undefined}
              onClick={() => setActive(active === tag ? null : tag)}
            >
              {tag} {count}
            </button>
          ))}
        </nav>
      )}

      {visible.length === 0 ? (
        <div className="empty-index">
          <span className="empty-index__mark" aria-hidden="true">+</span>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="content-index">
          {visible.map((item) => (
            <Link
              key={`${item.kind}-${item.slug}`}
              href={`/${item.kind}/${item.slug}`}
              className="index-entry"
            >
              <div className="index-entry__body">
                <h2>
                  {item.pinned && <span className="pin-badge">置顶</span>}
                  {item.title}
                </h2>
                {item.summary && <p>{item.summary}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
