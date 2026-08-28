import { loadIndex } from "@/lib/content";
import { ContentIndex } from "@/components/content/content-index";

export const dynamic = "force-static";

export default async function NotesPage() {
  const notes = await loadIndex("notes");

  return (
    <main id="main-content" className="site-shell archive-page">
      <header className="archive-header">
        <p className="eyebrow">SECTION / 01</p>
        <h1>NOTES</h1>
        <p>学习笔记、技术文档与持续形成的思考。</p>
        <span>{String(notes.length).padStart(3, "0")} ENTRIES</span>
      </header>
      <section aria-label="笔记索引">
        <ContentIndex items={notes} emptyMessage="暂无笔记。发布后的文字会按索引排列在这里。" />
      </section>
    </main>
  );
}
