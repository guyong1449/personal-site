import type { MetadataRoute } from "next";
import { loadIndex } from "@/lib/content";
import { siteConfig } from "@/lib/config";

export const dynamic = "force-static";

function lastModified(value: string | null) {
  if (!value) return {};
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? {} : { lastModified: date };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url;

  const [notes, gallery] = await Promise.all([
    loadIndex("notes"),
    loadIndex("gallery"),
  ]);

  const noteRoutes = notes.map((note) => ({
    url: `${baseUrl}/notes/${note.slug}`,
    ...lastModified(note.updated ?? note.created),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const galleryRoutes = gallery.map((item) => ({
    url: `${baseUrl}/gallery/${item.slug}`,
    ...lastModified(item.updated ?? item.created),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    {
      url: baseUrl,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/notes`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/gallery`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/account`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/archive`,
      changeFrequency: "weekly",
      priority: 0.4,
    },
    ...noteRoutes,
    ...galleryRoutes,
  ];
}
