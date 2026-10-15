import { loadIndex } from "@/lib/content";
import { ContentIndex } from "@/components/content/content-index";
import Link from "next/link";
import siteProfile from "@/lib/site-profile.json";

export const metadata = {
  alternates: { canonical: "/" },
};

export const dynamic = "force-static";

export default async function HomePage() {
  const notes = await loadIndex("notes");

  return (
    <main id="main-content" className="font-family-zh">
      <section className="site-shell hero">
        <h1 className="sr-only">Ruoying Wang 的个人网站</h1>
          <div className="hero__links">
            <a className="hero__link" href="mailto:rw335@duke.edu" aria-label="给 Ruoying Wang 发邮件" title="Email">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 5h18v14H3V5Zm2 2v.3l7 5.2 7-5.2V7H5Zm14 10V9.8l-7 5.2-7-5.2V17h14Z" />
              </svg>
            </a>
            <a className="hero__link" href="https://guyong1449.github.io/" aria-label="访问 Ruoying Wang 的研究主页" title="Research homepage">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="hero__research-icon">
                <path d="m2 9 10-5 10 5-10 5-10-5Z" /><path d="M6 11v6c4 3 8 3 12 0v-6M22 9v7" />
              </svg>
              <span lang="en" className="font-family-en">Research</span>
            </a>
            <a className="hero__link" href="https://github.com/guyong1449" aria-label="访问 guyong1449 的 GitHub" title="GitHub">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.76-.24.76-.54v-2.1c-3.12.68-3.78-1.33-3.78-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.94.1-.73.4-1.22.71-1.5-2.49-.28-5.11-1.25-5.11-5.54 0-1.22.43-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.08 1.15a10.7 10.7 0 0 1 5.6 0c2.14-1.45 3.08-1.15 3.08-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.3-2.62 5.25-5.12 5.53.4.35.76 1.03.76 2.08v3.1c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z" />
              </svg>
            </a>
          </div>
        <p className="hero__intro">
          {siteProfile.intro}<a href="https://guyong1449.github.io/">研究主页</a>
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
