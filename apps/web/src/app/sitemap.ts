import type { MetadataRoute } from "next";
import { loadIndex } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://personal-site.vercel.app";

  const [notes, courses, gallery] = await Promise.all([
    loadIndex("notes"),
    loadIndex("courses"),
    loadIndex("gallery"),
  ]);

  const noteRoutes = notes.map((note) => ({
    url: `${baseUrl}/notes/${note.slug}`,
    lastModified: note.updated ? new Date(note.updated) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const courseRoutes = courses.map((course) => ({
    url: `${baseUrl}/courses/${course.slug}`,
    lastModified: course.updated ? new Date(course.updated) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
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
      url: `${baseUrl}/courses`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/gallery`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...noteRoutes,
    ...courseRoutes,
    ...galleryRoutes,
  ];
}
