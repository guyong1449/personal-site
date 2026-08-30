"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { ContentListItem } from "@/lib/content";
import {
  filterGalleryItems,
  galleryAssetPath,
  type GalleryFilter,
  type GalleryFilterKey,
} from "@/lib/gallery";

type FilterOption = { value: string; count: number };

export function FilterableIndex({
  items,
  emptyMessage,
  galleryFilters = false,
}: {
  items: ContentListItem[];
  emptyMessage: string;
  galleryFilters?: boolean;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const paramTag = searchParams.get("tag");
  const paramCategory = galleryFilters ? searchParams.get("category") : null;
  const paramSeries = galleryFilters ? searchParams.get("series") : null;

  const activeFilters = useMemo<GalleryFilter[]>(
    () => [
      paramTag ? { key: "tag", value: paramTag } : null,
      paramCategory ? { key: "category", value: paramCategory } : null,
      paramSeries ? { key: "series", value: paramSeries } : null,
    ].filter((filter): filter is GalleryFilter => filter !== null),
    [paramCategory, paramSeries, paramTag],
  );

  const countValues = (values: (string | null)[]) => {
    const counter = new Map<string, number>();
    for (const value of values) {
      if (value) counter.set(value, (counter.get(value) ?? 0) + 1);
    }
    return [...counter.entries()].sort((left, right) => right[1] - left[1]);
  };

  const tags = useMemo<FilterOption[]>(
    () => countValues(items.flatMap((item) => item.tags)).map(([value, count]) => ({ value, count })),
    [items],
  );
  const categories = useMemo<FilterOption[]>(
    () => countValues(items.map((item) => item.artCategory)).map(([value, count]) => ({ value, count })),
    [items],
  );
  const series = useMemo<FilterOption[]>(
    () => countValues(items.map((item) => item.series)).map(([value, count]) => ({ value, count })),
    [items],
  );

  const visible = useMemo(() => filterGalleryItems(items, activeFilters), [activeFilters, items]);

  const setFilter = (key: GalleryFilterKey, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get(key) === value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    ["tag", "category", "series"].forEach((key) => params.delete(key));
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const renderFilterButtons = (key: GalleryFilterKey, options: FilterOption[], prefix = "") =>
    options.map(({ value, count }) => (
      <button
        key={`${key}-${value}`}
        type="button"
        className={activeFilters.some((filter) => filter.key === key && filter.value === value) ? "is-active" : undefined}
        aria-pressed={activeFilters.some((filter) => filter.key === key && filter.value === value)}
        onClick={() => setFilter(key, value)}
      >
        {prefix}{value} {count}
      </button>
    ));

  return (
    <div>
      {(tags.length > 0 || (galleryFilters && (categories.length > 0 || series.length > 0))) && (
        <nav className="tag-filter" aria-label={galleryFilters ? "作品筛选" : "标签筛选"}>
          <button
            type="button"
            className={activeFilters.length === 0 ? "is-active" : undefined}
            aria-pressed={activeFilters.length === 0}
            onClick={clearFilters}
          >
            全部 {items.length}
          </button>
          {renderFilterButtons("tag", tags)}
          {galleryFilters && renderFilterButtons("category", categories, "分类 · ")}
          {galleryFilters && renderFilterButtons("series", series, "系列 · ")}
        </nav>
      )}

      {visible.length === 0 ? (
        <div className="empty-index">
          <span className="empty-index__mark" aria-hidden="true">+</span>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="content-index">
          {visible.map((item) => {
            const coverSrc = galleryAssetPath(item.cover);

            return (
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
                {coverSrc && (
                  <div className="index-entry__cover">
                    <Image
                      src={`/${coverSrc}`}
                      alt={`${item.title} 封面`}
                      fill
                      sizes="(max-width: 680px) 220px, 88px"
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
