import { loadIndex } from "@/lib/content";
import Link from "next/link";

export const dynamic = "force-static";

export default async function NotesPage() {
  const notes = await loadIndex("notes");

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <section className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">Notes</h1>
        <p className="text-lg text-[rgba(34,27,22,0.72)]">
          学习笔记和技术文档
        </p>
      </section>

      <section>
        {notes.length === 0 ? (
          <p className="text-[rgba(34,27,22,0.6)]">暂无笔记内容</p>
        ) : (
          <div className="grid gap-6">
            {notes.map((note) => (
              <Link
                key={note.slug}
                href={`/notes/${note.slug}`}
                className="block rounded-[20px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[0_8px_24px_rgba(69,47,25,0.06)] transition-all hover:shadow-[0_12px_32px_rgba(69,47,25,0.1)]"
              >
                <h2 className="mb-2 text-xl font-semibold">{note.title}</h2>
                {note.summary && (
                  <p className="mb-3 text-[rgba(34,27,22,0.72)]">{note.summary}</p>
                )}
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
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
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
