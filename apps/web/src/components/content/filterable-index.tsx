"use client";

import Image from "next/image";
import Link from "next/link";
import type { ContentListItem } from "@/lib/content";
import { PublicationMonth } from "./publication-month";
import { galleryAssetPath } from "@/lib/gallery";
import { matchesContentFilters } from "@/lib/content-filters";
import { ContentFilters } from "./content-filters";
import { useContentFilterParams } from "./use-content-filter-params";

export function FilterableIndex({
  items,
  emptyMessage,
  galleryFilters = false,
}: {
  items: ContentListItem[];
  emptyMessage: string;
  galleryFilters?: boolean;
}) {
  const { params, updateParams } = useContentFilterParams();
  const visible = items.filter((item) => matchesContentFilters(item, params));

  return (
    <div>
      <ContentFilters items={items} params={params} onChange={updateParams} galleryFilters={galleryFilters} />

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
                  <PublicationMonth created={item.created} />
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
