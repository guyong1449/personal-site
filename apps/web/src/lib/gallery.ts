import type { Metadata } from "next";
import type { ContentDocument, ContentListItem } from "./content/types";

export type GalleryFilterKey = "tag" | "category" | "series";

export type GalleryFilter = {
  key: GalleryFilterKey;
  value: string;
};

export type GalleryNavigation = {
  previous: ContentListItem | null;
  next: ContentListItem | null;
  sameSeries: ContentListItem[];
  sameCategory: ContentListItem[];
};

export function galleryAssetPath(cover: string | null | undefined): string | null {
  if (!cover) return null;
  const normalized = cover.replace(/^\/+/, "");
  return normalized.startsWith("assets/") ? normalized : `assets/${normalized}`;
}
export function galleryCanonicalUrl(siteUrl: string, slug: string): string {
  return new URL(`/gallery/${slug}`, siteUrl).toString();
}

export function gallerySocialImageUrl(
  siteUrl: string,
  slug: string,
  cover: string | null | undefined,
): string {
  const assetPath = galleryAssetPath(cover);
  return new URL(
    assetPath ? `/${assetPath}` : `/gallery/${slug}/opengraph-image`,
    siteUrl,
  ).toString();
}

export function galleryFilterHref(
  key: GalleryFilterKey,
  value: string,
  basePath = "/gallery",
): string {
  const params = new URLSearchParams([[key, value]]);
  return `${basePath}?${params.toString()}`;
}

export function filterGalleryItems(
  items: ContentListItem[],
  filters: GalleryFilter[],
): ContentListItem[] {
  return items.filter((item) =>
    filters.every(({ key, value }) => {
      if (key === "tag") return item.tags.includes(value);
      if (key === "category") return item.artCategory === value;
      return item.series === value;
    }),
  );
}

export function galleryNavigation(
  items: ContentListItem[],
  slug: string,
  item: Pick<ContentDocument, "series" | "artCategory">,
): GalleryNavigation {
  const index = items.findIndex((entry) => entry.slug === slug);
  const siblings = items.filter((entry) => entry.slug !== slug);

  return {
    previous: index >= 0 && index < items.length - 1 ? items[index + 1] : null,
    next: index > 0 ? items[index - 1] : null,
    sameSeries: item.series ? siblings.filter((entry) => entry.series === item.series) : [],
    sameCategory: item.artCategory
      ? siblings.filter((entry) => entry.artCategory === item.artCategory)
      : [],
  };
}

export function galleryMetadata(item: ContentDocument, siteUrl: string): Metadata {
  const canonical = galleryCanonicalUrl(siteUrl, item.slug);
  const image = gallerySocialImageUrl(siteUrl, item.slug, item.cover);

  return {
    title: item.title,
    description: item.summary || undefined,
    alternates: { canonical },
    openGraph: {
      title: item.title,
      description: item.summary || undefined,
      url: canonical,
      type: "website",
      images: [{ url: image, alt: `${item.title} 预览图` }],
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description: item.summary || undefined,
      images: [image],
    },
  };
}
