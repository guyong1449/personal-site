import { loadEntry, loadIndex } from "@/lib/content";
import { MarkdownBody } from "@/components/markdown";
import { NoteComments } from "@/components/note-comments";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-static";

export async function generateStaticParams() {
  const notes = await loadIndex("notes");
  return notes.map((note) => ({ slug: note.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const note = await loadEntry("notes", slug);

  if (!note) {
    return { title: "Note Not Found" };
  }

  return {
    title: note.title,
    description: note.summary,
    openGraph: {
      title: note.title,
      description: note.summary ?? undefined,
      type: "article",
      publishedTime: note.created ?? undefined,
      modifiedTime: note.updated ?? undefined,
      tags: note.tags,
    },
  };
}

export default async function NoteDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const note = await loadEntry("notes", slug);

  if (!note) {
    notFound();
  }

  const index = await loadIndex("notes");
  const position = index.findIndex((item) => item.slug === slug);
  const newer = position > 0 ? index[position - 1] : null;
  const older = position >= 0 && position < index.length - 1 ? index[position + 1] : null;
  const related = index
    .filter((item) => item.slug !== slug && item.tags.some((tag) => note.tags.includes(tag)))
    .sort(
      (left, right) =>
        right.tags.filter((tag) => note.tags.includes(tag)).length -
        left.tags.filter((tag) => note.tags.includes(tag)).length,
    )
    .slice(0, 2);

  const coverSrc = note.cover
    ? note.cover.startsWith("assets/")
      ? note.cover
      : `assets/${note.cover}`
    : null;

  return (
    <main id="main-content" className="site-shell archive-page article-page">
      <article>
        <header className="article-header">
          {note.updated && <p className="article-meta">{note.updated}</p>}
          <h1>{note.title}</h1>
          {note.summary && <p className="article-header__summary">{note.summary}</p>}
          {note.tags.length > 0 && (
            <div className="tag-list" aria-label="标签">
              {note.tags.map((tag) => (
                <Link key={tag} href={`/notes?tag=${encodeURIComponent(tag)}`}>
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </header>

        {coverSrc && (
          <div className="article-cover">
            <Image
              src={`/${coverSrc}`}
              alt={`${note.title} 封面`}
              fill
              sizes="(max-width: 900px) 100vw, 800px"
              priority
            />
          </div>
        )}

        <MarkdownBody content={note.body} />

        <nav className="post-nav" aria-label="相邻文章">
          {older ? (
            <Link href={`/notes/${older.slug}`} className="post-nav__item">
              <span>← 较早</span>
              <strong>{older.title}</strong>
            </Link>
          ) : (
            <span />
          )}
          {newer ? (
            <Link href={`/notes/${newer.slug}`} className="post-nav__item post-nav__item--right">
              <span>较新 →</span>
              <strong>{newer.title}</strong>
            </Link>
          ) : (
            <span />
          )}
        </nav>

        {related.length > 0 && (
          <section className="related" aria-label="相关文章">
            <h2>相关文章</h2>
            {related.map((item) => (
              <Link key={item.slug} href={`/notes/${item.slug}`} className="related__item">
                <strong>{item.title}</strong>
                {item.summary && <span>{item.summary}</span>}
              </Link>
            ))}
          </section>
        )}

        <div className="article-footer">
          <NoteComments />
          <Link href="/notes" className="back-link">← BACK TO NOTES</Link>
        </div>
      </article>
    </main>
  );
}
