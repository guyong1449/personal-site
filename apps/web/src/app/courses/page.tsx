import { loadIndex } from "@/lib/content";
import { ContentIndex } from "@/components/content/content-index";

export const dynamic = "force-static";

export default async function CoursesPage() {
  const courses = await loadIndex("courses");

  return (
    <main id="main-content" className="site-shell archive-page">
      <header className="archive-header">
        <p className="eyebrow">SECTION / 02</p>
        <h1>COURSES</h1>
        <p>按课程和周次归档的学习材料。</p>
        <span>{String(courses.length).padStart(3, "0")} ENTRIES</span>
      </header>
      <section aria-label="课程索引">
        <ContentIndex items={courses} emptyMessage="暂无课程内容。新的课程材料会在发布后显示。" />
      </section>
    </main>
  );
}
