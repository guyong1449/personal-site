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
          <h1>GUYONG</h1>
          <p className="hero__intro">
            你好，我是 GUYONG。这里记录我的技术学习、课程笔记与长期的思考，偶尔也放一些小画。
          </p>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="hero-visual__grid" />
          <div className="hero-visual__cyan" />
          <div className="hero-visual__black" />
          <div className="hero-visual__pink" />
          <div className="hero-visual__cross">+</div>
        </div>
      </section>

      <section className="site-shell home-gallery" aria-label="画作展示">
        <header className="section-heading">
          <h2>主画与局部</h2>
          <Link href="/gallery" className="text-link">全部作品 ↗</Link>
        </header>

        <figure className="showpiece">
          <ArtCanvas variant="wide" />
          <figcaption>几何占位 · 非正式作品</figcaption>
        </figure>

        <figure className="showpiece showpiece--detail">
          <ArtCanvas variant="detail" />
          <figcaption>局部裁切</figcaption>
        </figure>
      </section>

      <section className="site-shell home-feed">
        <header className="section-heading">
          <h2>最近更新</h2>
          <Link href="/notes" className="text-link">全部文章 ↗</Link>
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
