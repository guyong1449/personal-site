import { loadIndex } from "@/lib/content";
import { ContentIndex } from "@/components/content/content-index";

export const dynamic = "force-static";

export default async function GalleryPage() {
  const gallery = await loadIndex("gallery");

  return (
    <main id="main-content" className="site-shell archive-page">
      <header className="archive-header">
        <p className="eyebrow">SECTION / 02</p>
        <h1>GALLERY</h1>
        <p>少量图像、作品与视觉实验，保持克制。</p>
        <span>{String(gallery.length).padStart(3, "0")} ENTRIES</span>
      </header>
      <section aria-label="作品索引">
        <ContentIndex items={gallery} emptyMessage="暂无图像作品。这里会保持小规模、选择性更新。" />
      </section>
    </main>
  );
}
