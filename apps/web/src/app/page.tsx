import { loadIndex } from "@/lib/content";
import { ContentIndex } from "@/components/content/content-index";
import Link from "next/link";

export const metadata = {
  alternates: { canonical: "/" },
};

export const dynamic = "force-static";

export default async function HomePage() {
  const notes = await loadIndex("notes");

  return (
    <main id="main-content">
      <section className="site-shell hero">
        <div className="hero__title-row">
          <h1>GUYONG</h1>
          <div className="hero__links">
            <a className="hero__link" href="mailto:rw335@duke.edu" aria-label="给 Ruoying Wang 发邮件" title="Email">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 5h18v14H3V5Zm2 2v.3l7 5.2 7-5.2V7H5Zm14 10V9.8l-7 5.2-7-5.2V17h14Z" />
              </svg>
            </a>
            <a className="hero__link" href="https://guyong1449.github.io/" aria-label="访问 Ruoying Wang 的研究主页" title="Research homepage">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2c.9 0 2.2 2.2 2.6 7H9.4C9.8 6.2 11.1 4 12 4ZM4.1 11a8 8 0 0 1 4.5-6.4A18.6 18.6 0 0 0 7.4 11H4.1Zm0 2h3.3c.1 2.5.5 4.6 1.2 6.4A8 8 0 0 1 4.1 13ZM12 20c-.9 0-2.2-2.2-2.6-7h5.2c-.4 4.8-1.7 7-2.6 7Zm3.4-.6c.7-1.8 1.1-3.9 1.2-6.4h3.3a8 8 0 0 1-4.5 6.4Zm1.2-8.4c-.1-2.5-.5-4.6-1.2-6.4A8 8 0 0 1 19.9 11h-3.3Z" />
              </svg>
            </a>
          </div>
        </div>
        <p className="hero__intro">
          你好，我是 Ruoying Wang（id：guyong）。这里记录我的技术学习、课程笔记与长期的思考，偶尔也放一些小画。研究项目与简历见<a href="https://guyong1449.github.io/">研究主页</a>。
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
