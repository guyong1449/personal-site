import { loadIndex } from "@/lib/content";
import { siteConfig } from "@/lib/config";
import Link from "next/link";

export const dynamic = "force-static";

export const metadata = {
  title: "Archive",
};

function entryDate(entry: { updated: string | null; created?: string | null }) {
  return entry.updated || entry.created || "";
}

export default async function ArchivePage() {
  const [notes, gallery] = await Promise.all([loadIndex("notes"), loadIndex("gallery")]);

  const entries = [
    ...notes.map((item) => ({ ...item, href: `/notes/${item.slug}` })),
    ...gallery.map((item) => ({ ...item, href: `/gallery/${item.slug}` })),
  ].sort((left, right) => entryDate(right).localeCompare(entryDate(left)));

  const byYear = new Map<string, typeof entries>();
  for (const entry of entries) {
    const year = (entryDate(entry) || "未注明日期").slice(0, 4);
    const list = byYear.get(year) ?? [];
    list.push(entry);
    byYear.set(year, list);
  }

  return (
    <main id="main-content" className="site-shell archive-page">
      <header className="archive-header">
        <h1>ARCHIVE</h1>
        <span>{entries.length} 条记录</span>
      </header>

      {entries.length === 0 ? (
        <div className="empty-index">
          <span className="empty-index__mark" aria-hidden="true">+</span>
          <p>还没有可归档的内容。</p>
        </div>
      ) : (
        Array.from(byYear.entries()).map(([year, yearEntries]) => (
          <section key={year} className="timeline-year" aria-label={`${year} 年归档`}>
            <h2>{year}</h2>
            <div className="content-index">
              {yearEntries.map((entry) => (
                <Link key={`${entry.kind}-${entry.slug}`} href={entry.href} className="index-entry">
                  <div className="index-entry__body">
                    <h2>
                      {entry.pinned && <span className="pin-badge">置顶</span>}
                      {entry.title}
                    </h2>
                    {entry.summary && <p>{entry.summary}</p>}
                  </div>
                  <span className="timeline-meta">
                    {entry.kind === "gallery" ? "GALLERY" : "NOTE"} · {entryDate(entry).slice(5, 10)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}

      <footer className="archive-footnote">
        由 {siteConfig.name} 的公开存档生成 ·{" "}
        <Link href="/search" className="text-link">搜索全文 ↗</Link>
      </footer>
    </main>
  );
}
