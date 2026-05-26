import { loadEntry, loadIndex } from "@/lib/content";
import { MarkdownBody } from "@/components/markdown";
import { notFound } from "next/navigation";

export const dynamic = "force-static";

export async function generateStaticParams() {
  const courses = await loadIndex("courses");
  return courses.map((course) => ({ slug: course.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await loadEntry("courses", slug);

  if (!course) {
    return { title: "Course Not Found" };
  }

  return {
    title: course.title,
    description: course.summary,
  };
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await loadEntry("courses", slug);

  if (!course) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <article>
        <header className="mb-8">
          <h1 className="mb-4 text-4xl font-bold">{course.title}</h1>
          {course.summary && (
            <p className="text-lg text-[rgba(34,27,22,0.72)]">{course.summary}</p>
          )}
          {course.course && (
            <p className="mt-2 text-[var(--accent)]">课程: {course.course}</p>
          )}
          {course.week && (
            <p className="mt-1 text-[rgba(34,27,22,0.6)]">周次: {course.week}</p>
          )}
          {course.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
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
        </header>

        <MarkdownBody content={course.body} />
      </article>
    </main>
  );
}
