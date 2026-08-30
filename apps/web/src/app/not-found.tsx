import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="site-shell not-found-page">
      <section className="not-found-card">
        <h1>页面未找到</h1>
        <p className="not-found-copy">
          抱歉，您访问的页面不存在或已被移除。
        </p>
        <Link href="/" className="not-found-link">
          返回首页
        </Link>
      </section>
    </main>
  );
}
