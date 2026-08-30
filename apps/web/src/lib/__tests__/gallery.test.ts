import { describe, expect, it } from "vitest";
import {
  filterGalleryItems,
  galleryFilterHref,
  galleryMetadata,
  galleryNavigation,
  gallerySocialImageUrl,
} from "../gallery";
import type { ContentDocument, ContentListItem } from "../content/types";

const item = (overrides: Partial<ContentListItem>): ContentListItem => ({
  kind: "gallery",
  slug: "one",
  title: "作品一",
  summary: "摘要",
  tags: ["topic/art"],
  cover: null,
  created: "2026-08-29",
  updated: "2026-08-30",
  pinned: false,
  artCategory: "illustration",
  series: "alpha",
  ...overrides,
});

const document = (overrides: Partial<ContentDocument> = {}): ContentDocument => ({
  ...item({}),
  body: "正文",
  created: "2026-08-29",
  contentType: "gallery",
  ...overrides,
});

describe("gallery helpers", () => {
  it("uses a cover URL and falls back to the generated social card", () => {
    expect(gallerySocialImageUrl("https://guyong.site", "one", "cover.webp")).toBe(
      "https://guyong.site/assets/cover.webp",
    );
    expect(gallerySocialImageUrl("https://guyong.site", "one", null)).toBe(
      "https://guyong.site/gallery/one/opengraph-image",
    );
  });

  it("builds copyable gallery filter URLs", () => {
    expect(galleryFilterHref("tag", "topic/art")).toBe("/gallery?tag=topic%2Fart");
    expect(galleryFilterHref("series", "alpha beta")).toBe("/gallery?series=alpha+beta");
  });

  it("filters by all selected gallery dimensions", () => {
    const entries = [
      item({ slug: "one" }),
      item({ slug: "two", tags: ["topic/photo"], series: "beta" }),
    ];

    expect(filterGalleryItems(entries, [{ key: "series", value: "alpha" }]).map((entry) => entry.slug)).toEqual([
      "one",
    ]);
    expect(
      filterGalleryItems(entries, [
        { key: "tag", value: "topic/art" },
        { key: "category", value: "illustration" },
      ]).map((entry) => entry.slug),
    ).toEqual(["one"]);
  });

  it("returns adjacent and taxonomy siblings without inventing empty links", () => {
    const entries = [
      item({ slug: "new" }),
      item({ slug: "current" }),
      item({ slug: "old", artCategory: "photo", series: "beta" }),
    ];

    const navigation = galleryNavigation(entries, "current", document({ slug: "current" }));

    expect(navigation.previous?.slug).toBe("old");
    expect(navigation.next?.slug).toBe("new");
    expect(navigation.sameSeries.map((entry) => entry.slug)).toEqual(["new"]);
    expect(navigation.sameCategory.map((entry) => entry.slug)).toEqual(["new"]);

    const first = galleryNavigation(entries, "new", document({ slug: "new" }));
    expect(first.next).toBeNull();
  });

  it("publishes Open Graph and Twitter metadata with a cover fallback", () => {
    const withCover = galleryMetadata(document({ cover: "assets/work.webp" }), "https://guyong.site");
    const fallback = galleryMetadata(document({ cover: null }), "https://guyong.site");
    const coverImage = withCover.openGraph?.images;
    const fallbackImage = fallback.openGraph?.images;

    expect(withCover.alternates?.canonical).toBe("https://guyong.site/gallery/one");
    expect(Array.isArray(coverImage) ? coverImage[0] : coverImage).toMatchObject({
      url: "https://guyong.site/assets/work.webp",
    });
    expect((withCover.twitter as { card?: string } | undefined)?.card).toBe("summary_large_image");
    expect(Array.isArray(fallbackImage) ? fallbackImage[0] : fallbackImage).toMatchObject({
      url: "https://guyong.site/gallery/one/opengraph-image",
    });
  });
});
