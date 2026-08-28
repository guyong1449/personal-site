import { loadEntry } from "@/lib/content";
import { MarkdownBody } from "@/components/markdown";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

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

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <article>
        <header className="mb-8">
          <h1 className="mb-4 text-4xl font-bold">{note.title}</h1>
          {note.summary && (
            <p className="text-lg text-[rgba(34,27,22,0.72)]">{note.summary}</p>
          )}
          {note.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {note.tags.map((tag) => (
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

        <MarkdownBody content={note.body} />
      </article>
    </main>
  );
}
