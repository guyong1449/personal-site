import { loadIndex } from "@/lib/content";
import { ContentIndex } from "@/components/content/content-index";
import Link from "next/link";

export const dynamic = "force-static";

export default async function HomePage() {
  const notes = await loadIndex("notes");

  return (
    <main id="main-content">
      <section className="site-shell hero">
        <div className="hero__title-row">
          <h1>GUYONG</h1>
          <a
            className="hero__github"
            href="https://github.com/guyong1449"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="访问 GUYONG 的 GitHub 主页"
            title="GitHub"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 1C5.923 1 1 5.923 1 12c0 4.867 3.149 8.979 7.521 10.436.55.096.756-.233.756-.522 0-.262-.013-1.128-.013-2.049-2.764.509-3.479-.674-3.699-1.292-.124-.317-.66-1.293-1.127-1.554-.385-.207-.936-.715-.014-.729.866-.014 1.485.797 1.691 1.128.99 1.663 2.571 1.196 3.204.907.096-.715.385-1.196.701-1.485-2.475-.275-5.06-1.237-5.06-5.5 0-1.21.426-2.214 1.128-3.025-.111-.275-.496-1.43.11-2.983 0 0 .92-.288 3.024 1.155a10.193 10.193 0 0 1 2.75-.371c.936 0 1.871.123 2.75.371 2.104-1.457 3.025-1.155 3.025-1.155.605 1.553.22 2.708.11 2.983.701.811 1.127 1.801 1.127 3.025 0 4.276-2.599 5.225-5.073 5.5.399.344.743 1.004.743 2.035 0 1.471-.014 2.654-.014 3.025 0 .289.206.632.756.522C19.851 20.979 23 16.854 23 12c0-6.077-4.922-11-11-11Z" />
            </svg>
          </a>
        </div>
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
