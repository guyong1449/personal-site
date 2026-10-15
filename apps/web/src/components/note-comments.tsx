"use client";

import { GiscusComments } from "@/components/giscus-comments";

// Giscus only mounts when the site owner has filled the env config
// (see docs/deployment.md); otherwise the section renders nothing so the
// article stays clean.
export function NoteComments() {
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO;
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY;
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;

  if (!repo || !repoId || !category || !categoryId) {
    if (process.env.NODE_ENV === "production") {
      return null;
    }

    return (
      <section className="note-comments note-comments--disabled" aria-label="评论" aria-live="polite">
        <p className="eyebrow">DISCUSS</p>
        <p className="note-comments__disabled">留言区未开启：请先在 Vercel / 环境变量里配置 Giscus。</p>
      </section>
    );
  }

  return (
    <section className="note-comments" aria-label="评论">
      <p className="eyebrow">DISCUSS</p>
      <GiscusComments
        repo={repo as `${string}/${string}`}
        repoId={repoId}
        category={category}
        categoryId={categoryId}
        reactionsEnabled={false}
        theme={typeof document !== "undefined" && document.documentElement.dataset.theme === "dark"
          ? "https://guyong.site/giscus/dark-no-reactions.css"
          : "https://guyong.site/giscus/light-no-reactions.css"}
      />
    </section>
  );
}
