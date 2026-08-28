import { loadSearchIndex } from "@/lib/content";
import { SearchClient } from "@/components/search/search-client";

export const dynamic = "force-static";

export const metadata = {
  title: "Search",
  robots: { index: false },
};

export default async function SearchPage() {
  const docs = await loadSearchIndex();

  return (
    <main id="main-content" className="site-shell archive-page">
      <header className="archive-header">
        <p className="eyebrow">SECTION / UTILITY</p>
        <h1>SEARCH</h1>
        <p>在全部已发布的文字里检索：标题、摘要、标签与全文。</p>
        <span>{String(docs.length).padStart(3, "0")} DOCS</span>
      </header>
      <section aria-label="搜索" className="search-section">
        <SearchClient docs={docs} />
      </section>
    </main>
  );
}
