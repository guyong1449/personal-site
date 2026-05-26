import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-8 shadow-[0_16px_40px_rgba(69,47,25,0.08)]">
        <h1 className="mb-4 text-4xl font-bold">页面未找到</h1>
        <p className="mb-6 text-lg text-[rgba(34,27,22,0.72)]">
          抱歉，您访问的页面不存在或已被移除。
        </p>
        <Link
          href="/"
          className="inline-block rounded-full bg-[var(--accent)] px-6 py-3 text-white transition-opacity hover:opacity-90"
        >
          返回首页
        </Link>
      </section>
    </main>
  );
}
