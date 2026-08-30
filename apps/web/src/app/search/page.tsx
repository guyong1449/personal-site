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
        <h1>SEARCH</h1>
      </header>
      <section aria-label="搜索" className="search-section">
        <SearchClient docs={docs} />
      </section>
    </main>
  );
}
