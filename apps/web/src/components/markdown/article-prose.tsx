"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";

type SelectedImage = { src: string; alt: string; width: number; height: number };

export function ArticleProse({ html }: { html: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<SelectedImage | null>(null);
  const [zoom, setZoom] = useState(1);

  const fitImage = () => {
    if (!selected || !canvas.current) return;
    setZoom(Math.min((canvas.current.clientWidth - 8) / selected.width,
      (canvas.current.clientHeight - 8) / selected.height, 1));
  };

  useEffect(() => {
    if (!selected) return;
    const modal = dialog.current;
    modal?.showModal();
    if (canvas.current) {
      setZoom(Math.min((canvas.current.clientWidth - 8) / selected.width,
        (canvas.current.clientHeight - 8) / selected.height, 1));
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      modal?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);

  const openImage = (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || image.closest("a") || !image.naturalWidth) return;
    if ("key" in event && !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    setSelected({ src: image.currentSrc || image.src, alt: image.alt, width: image.naturalWidth, height: image.naturalHeight });
  };

  const prose = useRef<HTMLElement>(null);

  // Decorate rendered code blocks with a copy affordance; re-runs when the
  // rendered html changes (draft preview updates, route navigation).
  useEffect(() => {
    const root = prose.current;
    if (!root) return;
    const buttons: HTMLButtonElement[] = [];
    for (const pre of root.querySelectorAll("pre")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "copy-code";
      button.textContent = "复制";
      button.setAttribute("aria-label", "复制代码");
      button.addEventListener("click", () => {
        const code = pre.querySelector("code") ?? pre;
        const done = () => {
          button.textContent = "已复制";
          button.classList.add("is-done");
          setTimeout(() => {
            button.textContent = "复制";
            button.classList.remove("is-done");
          }, 1600);
        };
        navigator.clipboard.writeText(code.innerText).then(done, () => {
          button.textContent = "复制失败";
          setTimeout(() => { button.textContent = "复制"; }, 1600);
        });
      });
      pre.appendChild(button);
      buttons.push(button);
    }
    return () => { for (const button of buttons) button.remove(); };
  }, [html]);

  return <>
    <article ref={prose} className="prose prose-lg max-w-none min-w-0 flex-1"
      onClick={openImage} onKeyDown={openImage} dangerouslySetInnerHTML={{ __html: html }} />
    <dialog ref={dialog} className="image-viewer" aria-label={selected?.alt ? `图片：${selected.alt}` : "查看原图"}
      onCancel={(event) => { event.preventDefault(); setSelected(null); }}>
      <div className="image-viewer__toolbar">
        <button type="button" aria-label="缩小图片" onClick={() => setZoom((value) => Math.max(.1, value / 1.5))}>−</button>
        <button type="button" aria-label="放大图片" onClick={() => setZoom((value) => Math.min(4, value * 1.5))}>＋</button>
        <output aria-label="图片缩放比例">{Math.round(zoom * 100)}%</output>
        <button type="button" onClick={fitImage}>适应屏幕</button>
        <button type="button" onClick={() => setZoom(1)}>原图</button>
        <button type="button" onClick={() => setSelected(null)}>关闭</button>
      </div>
      <div ref={canvas} className="image-viewer__canvas" tabIndex={0} aria-label="图片，可滚动查看细节">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {selected && <img src={selected.src} alt={selected.alt} style={{ width: `${selected.width * zoom}px` }} />}
      </div>
    </dialog>
  </>;
}
