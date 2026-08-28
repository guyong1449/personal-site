import Image from "next/image";
import Link from "next/link";
import type { ContentListItem } from "@/lib/content";

type ContentIndexProps = {
  items: ContentListItem[];
  emptyMessage: string;
  limit?: number;
};

function isString(value: string | null): value is string {
  return Boolean(value);
}

function getMeta(item: ContentListItem) {
  if (item.kind === "courses") {
    return [item.course, item.week ? `WEEK ${item.week}` : null].filter(isString);
  }

  if (item.kind === "gallery") {
    return [item.artCategory, item.series].filter(isString);
  }

  return item.updated ? [`UPDATED ${item.updated}`] : [];
}

export function ContentIndex({ items, emptyMessage, limit }: ContentIndexProps) {
  const visibleItems = typeof limit === "number" ? items.slice(0, limit) : items;

  if (visibleItems.length === 0) {
    return (
      <div className="empty-index">
        <span className="empty-index__mark" aria-hidden="true">+</span>
        <div>
          <p className="eyebrow">QUEUE / 000</p>
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-index">
      {visibleItems.map((item, index) => {
        const meta = getMeta(item);

        return (
          <Link
            key={`${item.kind}-${item.slug}`}
            href={`/${item.kind}/${item.slug}`}
            className="index-entry"
          >
            <span className="index-entry__number" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>

            <div className="index-entry__body">
              <div className="index-entry__meta">
                <span>{item.kind.toUpperCase()}</span>
                {meta.map((value) => <span key={value}>{value}</span>)}
              </div>
              <h2>{item.title}</h2>
              {item.summary && <p>{item.summary}</p>}
              {item.tags.length > 0 && (
                <div className="tag-list" aria-label="标签">
                  {item.tags.map((tag) => <span key={tag}>#{tag}</span>)}
                </div>
              )}
            </div>

            {item.cover && (
              <div className="index-entry__cover">
                <Image
                  src={item.cover}
                  alt={`${item.title} 封面`}
                  fill
                  sizes="(max-width: 640px) 28vw, 176px"
                />
              </div>
            )}

            <span className="index-entry__arrow" aria-hidden="true">↗</span>
          </Link>
        );
      })}
    </div>
  );
}
