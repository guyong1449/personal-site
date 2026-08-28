import { loadIndex } from "@/lib/content";
import { siteConfig } from "@/lib/config";
import { ContentIndex } from "@/components/content/content-index";
import Link from "next/link";

export const dynamic = "force-static";

export default async function HomePage() {
  const [notes, courses, gallery] = await Promise.all([
    loadIndex("notes"),
    loadIndex("courses"),
    loadIndex("gallery"),
  ]);

  return (
    <main id="main-content">
      <section className="site-shell hero">
        <div className="hero__copy">
          <p className="eyebrow">PERSONAL PUBLISHING SYSTEM / CN</p>
          <h1>
            <span>GUYONG</span>
            <span>/ INDEX</span>
          </h1>
          <p className="hero__intro">
            一个以文字为主的个人内容索引。记录学习、课程与思考，偶尔收纳少量图像创作。
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

      <section className="site-shell index-overview" aria-label="内容分类">
        {[
          { number: "01", title: "NOTES", label: "笔记与思考", href: "/notes", count: notes.length },
          { number: "02", title: "COURSES", label: "课程与资料", href: "/courses", count: courses.length },
          { number: "03", title: "GALLERY", label: "少量图像创作", href: "/gallery", count: gallery.length },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="overview-item">
            <span>{item.number}</span>
            <div>
              <h2>{item.title}</h2>
              <p>{item.label}</p>
            </div>
            <strong>{String(item.count).padStart(3, "0")}</strong>
          </Link>
        ))}
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
