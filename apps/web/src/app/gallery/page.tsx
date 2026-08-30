import { loadIndex } from "@/lib/content";
import { FilterableIndex } from "@/components/content/filterable-index";
import { Suspense } from "react";

export const dynamic = "force-static";

export const metadata = {
  title: "Gallery",
  description: "GUYONG 的小规模画作与图像作品集。",
  alternates: { canonical: "/gallery" },
};

export default async function GalleryPage() {
  const gallery = await loadIndex("gallery");

  return (
    <main id="main-content" className="site-shell archive-page">
      <header className="archive-header">
        <h1>GALLERY</h1>
      </header>
      <section aria-label="作品索引">
        <Suspense fallback={null}>
          <FilterableIndex
            items={gallery}
            emptyMessage="暂无图像作品。这里会保持小规模、选择性更新。"
            galleryFilters
          />
        </Suspense>
      </section>
    </main>
  );
}
