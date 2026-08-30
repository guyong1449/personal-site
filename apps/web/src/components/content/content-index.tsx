import Image from "next/image";
import Link from "next/link";
import type { ContentListItem } from "@/lib/content";
import { galleryAssetPath } from "@/lib/gallery";

type ContentIndexProps = {
  items: ContentListItem[];
  emptyMessage: string;
  limit?: number;
};

export function ContentIndex({ items, emptyMessage, limit }: ContentIndexProps) {
  const visibleItems = typeof limit === "number" ? items.slice(0, limit) : items;

  if (visibleItems.length === 0) {
    return (
      <div className="empty-index">
        <span className="empty-index__mark" aria-hidden="true">+</span>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="content-index">
      {visibleItems.map((item) => {
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
  );
}
