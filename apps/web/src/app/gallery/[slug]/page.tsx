import { loadEntry } from "@/lib/content";
import { MarkdownBody } from "@/components/markdown";
import Image from "next/image";
import Link from "next/link";
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

  const coverSrc = item.cover
    ? item.cover.startsWith("assets/")
      ? item.cover
      : `assets/${item.cover}`
    : null;

  return (
    <main id="main-content" className="site-shell archive-page article-page">
      <article>
        <header className="article-header">
          {[item.artCategory, item.series].some(Boolean) && (
            <p className="article-meta">
              {[item.artCategory, item.series].filter(Boolean).join(" · ")}
            </p>
          )}
          <h1>{item.title}</h1>
          {item.summary && <p className="article-header__summary">{item.summary}</p>}
          {item.tags.length > 0 && (
            <div className="tag-list" aria-label="标签">
              {item.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          )}
        </header>

        {coverSrc && (
          <div className="article-cover">
            <Image
              src={`/${coverSrc}`}
              alt={`${item.title} 封面`}
              fill
              sizes="(max-width: 900px) 100vw, 1180px"
              priority
            />
          </div>
        )}

        <MarkdownBody content={item.body} />

        <div className="article-footer">
          <Link href="/gallery" className="back-link">← BACK TO GALLERY</Link>
        </div>
      </article>
    </main>
  );
}
