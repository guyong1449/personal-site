import { loadIndex } from "@/lib/content";
import { siteConfig } from "@/lib/config";
import Link from "next/link";

export const dynamic = "force-static";

export default async function HomePage() {
  const [notes, courses, gallery] = await Promise.all([
    loadIndex("notes"),
    loadIndex("courses"),
    loadIndex("gallery"),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <section className="mb-12 rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-8 shadow-[0_16px_40px_rgba(69,47,25,0.08)]">
        <p className="mb-3 text-sm uppercase tracking-[0.2em] text-[var(--accent)]">
          Personal Site
        </p>
        <h1 className="mb-4 text-5xl leading-tight">个人站点</h1>
        <p className="max-w-3xl text-lg leading-8 text-[rgba(34,27,22,0.82)]">
          欢迎来到我的个人空间。这里汇集了学习笔记、课程内容和创意作品。
        </p>
      </section>

      <div className="grid gap-8 md:grid-cols-3">
        <section className="rounded-[20px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[0_8px_24px_rgba(69,47,25,0.06)]">
          <h2 className="mb-4 text-xl font-semibold">
            <Link href="/notes" className="hover:text-[var(--accent)] transition-colors">
              Notes
            </Link>
          </h2>
          <p className="mb-4 text-[rgba(34,27,22,0.72)]">学习笔记和技术文档</p>
          <div className="space-y-2">
            {notes.slice(0, 3).map((note) => (
              <Link
                key={note.slug}
                href={`/notes/${note.slug}`}
                className="block text-sm text-[rgba(34,27,22,0.6)] hover:text-[var(--accent)] transition-colors"
              >
                {note.title}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[20px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[0_8px_24px_rgba(69,47,25,0.06)]">
          <h2 className="mb-4 text-xl font-semibold">
            <Link href="/courses" className="hover:text-[var(--accent)] transition-colors">
              Courses
            </Link>
          </h2>
          <p className="mb-4 text-[rgba(34,27,22,0.72)]">课程内容和学习材料</p>
          <div className="space-y-2">
            {courses.slice(0, 3).map((course) => (
              <Link
                key={course.slug}
                href={`/courses/${course.slug}`}
                className="block text-sm text-[rgba(34,27,22,0.6)] hover:text-[var(--accent)] transition-colors"
              >
                {course.title}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[20px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[0_8px_24px_rgba(69,47,25,0.06)]">
          <h2 className="mb-4 text-xl font-semibold">
            <Link href="/gallery" className="hover:text-[var(--accent)] transition-colors">
              Gallery
            </Link>
          </h2>
          <p className="mb-4 text-[rgba(34,27,22,0.72)]">作品展示和创意内容</p>
          <div className="space-y-2">
            {gallery.slice(0, 3).map((item) => (
              <Link
                key={item.slug}
                href={`/gallery/${item.slug}`}
                className="block text-sm text-[rgba(34,27,22,0.6)] hover:text-[var(--accent)] transition-colors"
              >
                {item.title}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-8 flex justify-center">
        <Link
          href="/notes"
          className="rounded-full bg-[var(--accent)] px-6 py-3 text-white transition-opacity hover:opacity-90"
        >
          查看所有内容
        </Link>
      </section>
    </main>
  );
}
