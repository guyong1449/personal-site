import { loadIndex } from "@/lib/content";
import { FilterableIndex } from "@/components/content/filterable-index";
import { Suspense } from "react";

export const dynamic = "force-static";

export const metadata = {
  title: "Notes",
};

export default async function NotesPage() {
  const notes = await loadIndex("notes");

  return (
    <main id="main-content" className="site-shell archive-page">
      <header className="archive-header archive-header--notes">
        <h1>NOTES</h1>
      </header>
      <section aria-label="笔记索引">
        <Suspense fallback={null}>
          <FilterableIndex items={notes} emptyMessage="暂无笔记。发布后的文字会按索引排列在这里。" />
        </Suspense>
      </section>
    </main>
  );
}
