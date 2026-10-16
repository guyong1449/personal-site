"use client";

import { displayMonth } from "@/lib/display-date";

import { useEffect, useState } from "react";
import Link from "next/link";
import { studioParentOrigin } from "@/lib/studio-parent";
import { displayHeading } from "@/lib/display-heading";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import type { TocItem } from "@/lib/toc";

type Draft = { title: string; summary: string; updated: string; tags: string[]; cover: string; body: string; kind: string; coverSource: string; assets: { name: string; source: string }[] };

export function DraftPreview() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [rendered, setRendered] = useState<{ html: string; toc: TocItem[] }>({ html: "", toc: [] });
  const [error, setError] = useState("");
  useEffect(() => {
    const origin = studioParentOrigin();
    if (!origin) return;
    const receive = (event: MessageEvent) => {
      if (event.source === window.parent && event.origin === origin && event.data?.type === "studio:draft") {
        setDraft(event.data.draft);
      }
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "studio:draft-ready" }, origin);
    return () => window.removeEventListener("message", receive);
  }, []);
  useEffect(() => {
    if (!draft) return;
    const controller = new AbortController();
    fetch("/api/studio-preview", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft.body }), signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("正文预览暂时不可用");
      const result = await response.json();
      // Resolve local images in the same preview without copying or publishing assets.
      const holder = document.createElement("div");
      holder.innerHTML = result.html;
      for (const image of holder.querySelectorAll("img")) {
        const src = image.getAttribute("src") ?? "";
        if (/^(?:\/?assets\/|[^/:]+$)/.test(src)) {
          const name = decodeURIComponent(src.replace(/^\/?assets\//, ""));
          const source = draft.assets.find((asset) => asset.name === name)?.source ?? "site";
          image.src = `/studio-asset/${source}/${encodeURIComponent(name)}`;
        }
      }
      setRendered({ ...result, html: holder.innerHTML }); setError("");
    }).catch((failure) => { if (failure.name !== "AbortError") setError(failure.message); });
    return () => controller.abort();
  }, [draft]);
  return (
    <main id="main-content" className="site-shell archive-page article-page font-family-zh">
      {!draft ? <p role="status">正在载入草稿预览</p> : <article>
        <header className="article-header">
          {draft.updated && <p className="article-meta">{displayMonth(draft.updated)}</p>}
          <h1>{displayHeading(draft.title || "未命名草稿")}</h1>
          {draft.summary && <p className="article-header__summary">{displayHeading(draft.summary)}</p>}
          {draft.tags.length > 0 && <div className="tag-list" aria-label="标签">
            {draft.tags.map((tag) => <Link key={tag} href={`/${draft.kind}?tag=${encodeURIComponent(tag)}`}>#{tag}</Link>)}
          </div>}
        </header>
        {draft.cover && <div className="article-cover">
          {/* Same asset route as the editor; never writes generated/public content. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/studio-asset/${draft.coverSource}/${encodeURIComponent(draft.cover)}`} alt={`${draft.title} 封面`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>}
        {error && <p role="alert">{error}</p>}
        <MarkdownContent html={rendered.html} toc={rendered.toc} />
      </article>}
    </main>
  );
}
