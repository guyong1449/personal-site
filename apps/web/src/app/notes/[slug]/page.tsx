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
  };
}

export default async function NoteDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const note = await loadEntry("notes", slug);

  if (!note) {
    notFound();
  }

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
                <span key={tag}>#{tag}</span>
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
              sizes="(max-width: 900px) 100vw, 1180px"
              priority
            />
          </div>
        )}

        <MarkdownBody content={note.body} />

        <div className="article-footer">
          <NoteComments />
          <Link href="/notes" className="back-link">← BACK TO NOTES</Link>
        </div>
      </article>
    </main>
  );
}
