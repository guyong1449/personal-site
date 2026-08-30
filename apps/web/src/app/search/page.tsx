import { loadSearchIndex } from "@/lib/content";
import { SearchClient } from "@/components/search/search-client";
import { Suspense } from "react";

export const dynamic = "force-static";

export const metadata = {
  title: "Search",
  description: "搜索 GUYONG 的公开笔记与画作。",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

export default async function SearchPage() {
  const docs = await loadSearchIndex();

  return (
    <main id="main-content" className="site-shell archive-page">
      <header className="archive-header">
        <h1>SEARCH</h1>
      </header>
      <section aria-label="搜索" className="search-section">
        <Suspense fallback={<p className="search-count">正在准备搜索……</p>}>
          <SearchClient docs={docs} />
        </Suspense>
      </section>
    </main>
  );
}
