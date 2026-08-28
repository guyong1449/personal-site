import { loadIndex } from "@/lib/content";
import { ContentIndex } from "@/components/content/content-index";
import Link from "next/link";

export const dynamic = "force-static";

function ArtCanvas({ variant }: { variant: "wide" | "detail" }) {
  return (
    <div className={`art-canvas art-canvas--${variant}`} aria-hidden="true">
      <div className="art-canvas__grid" />
      <div className="art-canvas__cyan" />
      <div className="art-canvas__black" />
      <div className="art-canvas__pink" />
      <div className="art-canvas__yellow" />
      <div className="art-canvas__cross">+</div>
    </div>
  );
}

export default async function HomePage() {
  const notes = await loadIndex("notes");

  return (
    <main id="main-content">
      <section className="site-shell hero">
        <div className="hero__copy">
          <p className="eyebrow">PERSONAL ARCHIVE / CN</p>
          <h1>
            <span>GUYONG</span>
          </h1>
          <p className="hero__intro">
            记录技术学习、课程笔记与长期思考，少量画作。文字优先。
          </p>
          <div className="hero__actions">
            <Link href="/notes" className="primary-link">开始阅读 <span>→</span></Link>
            <span className="hero__status">ARCHIVE / ONLINE</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="原创抽象几何视觉">
          <div className="hero-visual__grid" />
          <div className="hero-visual__cyan" />
          <div className="hero-visual__black" />
          <div className="hero-visual__pink" />
          <div className="hero-visual__cross">+</div>
          <p>GI / 00</p>
          <span>TEXTUAL<br />ARCHIVE</span>
        </div>
      </section>

      <section className="site-shell home-gallery" aria-label="画作展示">
        <header className="section-heading">
          <div>
            <p className="eyebrow">GALLERY / FEATURED</p>
            <h2>主画与局部</h2>
          </div>
          <Link href="/gallery" className="text-link">GALLERY <span>↗</span></Link>
        </header>

        <figure className="showpiece">
          <ArtCanvas variant="wide" />
          <figcaption>WORK / 00 — 几何占位（非正式作品）</figcaption>
        </figure>

        <figure className="showpiece showpiece--detail">
          <ArtCanvas variant="detail" />
          <figcaption>DETAIL / 00 — 局部裁切</figcaption>
        </figure>
      </section>

      <section className="site-shell home-feed">
        <header className="section-heading">
          <div>
            <p className="eyebrow">LATEST / TEXT</p>
            <h2>最近更新</h2>
          </div>
          <Link href="/notes" className="text-link">ALL NOTES <span>↗</span></Link>
        </header>
        <ContentIndex
          items={notes}
          limit={4}
          emptyMessage="内容正在整理。第一篇文字发布后，会从这里进入索引。"
        />
      </section>
    </main>
  );
}
