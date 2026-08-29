import type { MetadataRoute } from "next";
import { loadIndex } from "@/lib/content";
import { siteConfig } from "@/lib/config";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url;

  const [notes, gallery] = await Promise.all([
    loadIndex("notes"),
    loadIndex("gallery"),
  ]);

  const noteRoutes = notes.map((note) => ({
    url: `${baseUrl}/notes/${note.slug}`,
    lastModified: note.updated ? new Date(note.updated) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const galleryRoutes = gallery.map((item) => ({
    url: `${baseUrl}/gallery/${item.slug}`,
    lastModified: item.updated ? new Date(item.updated) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/notes`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/gallery`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/account`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/archive`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.4,
    },
    ...noteRoutes,
    ...galleryRoutes,
  ];
}
