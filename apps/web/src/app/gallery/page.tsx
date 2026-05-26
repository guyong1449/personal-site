import { loadIndex } from "@/lib/content";
import Link from "next/link";

export const dynamic = "force-static";

export default async function GalleryPage() {
  const gallery = await loadIndex("gallery");

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <section className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">Gallery</h1>
        <p className="text-lg text-[rgba(34,27,22,0.72)]">
          作品展示和创意内容
        </p>
      </section>

      <section>
        {gallery.length === 0 ? (
          <p className="text-[rgba(34,27,22,0.6)]">暂无作品展示</p>
        ) : (
          <div className="grid gap-6">
            {gallery.map((item) => (
              <Link
                key={item.slug}
                href={`/gallery/${item.slug}`}
                className="block rounded-[20px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[0_8px_24px_rgba(69,47,25,0.06)] transition-all hover:shadow-[0_12px_32px_rgba(69,47,25,0.1)]"
              >
                <h2 className="mb-2 text-xl font-semibold">{item.title}</h2>
                {item.summary && (
                  <p className="mb-3 text-[rgba(34,27,22,0.72)]">{item.summary}</p>
                )}
                {item.artCategory && (
                  <p className="mb-2 text-sm text-[var(--accent)]">
                    分类: {item.artCategory}
                  </p>
                )}
                {item.series && (
                  <p className="mb-2 text-sm text-[rgba(34,27,22,0.6)]">
                    系列: {item.series}
                  </p>
                )}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
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
