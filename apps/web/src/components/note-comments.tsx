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
    return null;
  }

  return (
    <section className="note-comments" aria-label="评论">
      <p className="eyebrow">DISCUSS</p>
      <GiscusComments
        repo={repo as `${string}/${string}`}
        repoId={repoId}
        category={category}
        categoryId={categoryId}
        theme={typeof document !== "undefined" && document.documentElement.dataset.theme === "dark" ? "dark" : "light"}
      />
    </section>
  );
}
