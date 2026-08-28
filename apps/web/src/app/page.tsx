import { loadIndex } from "@/lib/content";
import { ContentIndex } from "@/components/content/content-index";
import Link from "next/link";

export const dynamic = "force-static";

export default async function HomePage() {
  const notes = await loadIndex("notes");

  return (
    <main id="main-content">
      <section className="site-shell hero">
        <h1>GUYONG</h1>
        <p className="hero__intro">
          你好，我是 GUYONG。这里记录我的技术学习、课程笔记与长期的思考，偶尔也放一些小画。
        </p>
      </section>

      <section className="site-shell home-feed">
        <header className="section-heading">
          <h2>最近更新</h2>
          <Link href="/notes" className="text-link">全部文章 ↗</Link>
        </header>
        <ContentIndex
          items={notes}
          limit={6}
          emptyMessage="内容正在整理。第一篇文字发布后，会从这里进入索引。"
        />
      </section>
    </main>
  );
}
