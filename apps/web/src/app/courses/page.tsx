import { loadIndex } from "@/lib/content";
import Link from "next/link";

export const dynamic = "force-static";

export default async function CoursesPage() {
  const courses = await loadIndex("courses");

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <section className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">Courses</h1>
        <p className="text-lg text-[rgba(34,27,22,0.72)]">
          课程内容和学习材料
        </p>
      </section>

      <section>
        {courses.length === 0 ? (
          <p className="text-[rgba(34,27,22,0.6)]">暂无课程内容</p>
        ) : (
          <div className="grid gap-6">
            {courses.map((course) => (
              <Link
                key={course.slug}
                href={`/courses/${course.slug}`}
                className="block rounded-[20px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[0_8px_24px_rgba(69,47,25,0.06)] transition-all hover:shadow-[0_12px_32px_rgba(69,47,25,0.1)]"
              >
                <h2 className="mb-2 text-xl font-semibold">{course.title}</h2>
                {course.summary && (
                  <p className="mb-3 text-[rgba(34,27,22,0.72)]">{course.summary}</p>
                )}
                {course.course && (
                  <p className="mb-2 text-sm text-[var(--accent)]">
                    课程: {course.course}
                  </p>
                )}
                {course.week && (
                  <p className="mb-2 text-sm text-[rgba(34,27,22,0.6)]">
                    周次: {course.week}
                  </p>
                )}
                {course.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {course.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs text-[var(--accent)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
