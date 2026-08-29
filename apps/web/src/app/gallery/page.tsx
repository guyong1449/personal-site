import { loadIndex } from "@/lib/content";
import { ContentIndex } from "@/components/content/content-index";

export const dynamic = "force-static";

export default async function GalleryPage() {
  const gallery = await loadIndex("gallery");

  return (
    <main id="main-content" className="site-shell archive-page">
      <header className="archive-header">
        <h1>GALLERY</h1>
        <span>{gallery.length} 件</span>
      </header>
      <section aria-label="作品索引">
        <ContentIndex items={gallery} emptyMessage="暂无图像作品。这里会保持小规模、选择性更新。" />
      </section>
    </main>
  );
}
