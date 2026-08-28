import { loadEntry } from "@/lib/content";
import { MarkdownBody } from "@/components/markdown";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await loadEntry("gallery", slug);

  if (!item) {
    return { title: "Gallery Item Not Found" };
  }

  return {
    title: item.title,
    description: item.summary,
  };
}

export default async function GalleryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await loadEntry("gallery", slug);

  if (!item) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <article>
        <header className="mb-8">
          <h1 className="mb-4 text-4xl font-bold">{item.title}</h1>
          {item.summary && (
            <p className="text-lg text-[rgba(34,27,22,0.72)]">{item.summary}</p>
          )}
          {item.artCategory && (
            <p className="mt-2 text-[var(--accent)]">分类: {item.artCategory}</p>
          )}
          {item.series && (
            <p className="mt-1 text-[rgba(34,27,22,0.6)]">系列: {item.series}</p>
          )}
          {item.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs text-[var(--accent)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <MarkdownBody content={item.body} />
      </article>
    </main>
  );
}
