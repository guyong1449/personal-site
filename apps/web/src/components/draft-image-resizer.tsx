"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { studioParentOrigin } from "@/lib/studio-parent";

/** Controls exist only around the local draft preview, never in published prose. */
export function DraftImageResizer({ body, starts, children }: { body: string; starts: number[]; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [box, setBox] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const drag = useRef<{ x: number; width: number; container: number; original: string } | null>(null);
  const [percent, setPercent] = useState(100);

  useEffect(() => { setImage(null); }, [body]);
  useEffect(() => {
    if (!image || !root.current) return;
    const update = () => {
      if (!root.current) return;
      const bounds = image.getBoundingClientRect();
      const parent = root.current.getBoundingClientRect();
      setBox({ left: bounds.left - parent.left, top: bounds.top - parent.top, width: bounds.width, height: bounds.height });
      setPercent(Math.max(1, Math.min(100, Math.round(bounds.width / (image.parentElement?.clientWidth || bounds.width) * 100))));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(image);
    observer.observe(root.current);
    return () => { observer.disconnect(); if (drag.current) image.style.width = drag.current.original; drag.current = null; };
  }, [image]);

  const commit = (width: number) => {
    const origin = studioParentOrigin();
    if (!origin || !image) return;
    window.parent.postMessage({ type: "studio:image-resize", body, start: Number(image.dataset.studioStart), width }, origin);
  };
  const cancel = () => {
    if (drag.current && image) image.style.width = drag.current.original;
    drag.current = null;
  };

  return <div ref={root} className="draft-image-editor"
    onClickCapture={(event) => {
      const target = event.target;
      if (target instanceof HTMLImageElement && starts.includes(Number(target.dataset.studioStart))) {
        event.preventDefault(); event.stopPropagation(); setImage(target);
      }
    }}
    onKeyDownCapture={(event) => {
      if (event.key === "Escape") { cancel(); setImage(null); }
      const target = event.target;
      if (target instanceof HTMLImageElement && starts.includes(Number(target.dataset.studioStart)) && ["Enter", " "].includes(event.key)) {
        event.preventDefault(); event.stopPropagation(); setImage(target);
      }
    }}>
    <p className="draft-image-hint">点选正文图片，拖动右下角调整大小；也可在编辑栏输入宽度。</p>
    {children}
    {image && <div className="draft-image-selection" style={box}>
      <output className="draft-image-size" aria-live="polite">{percent}%</output>
      <button type="button" className="draft-image-handle" aria-label="拖动缩放图片，或用左右方向键调整宽度"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          drag.current = { x: event.clientX, width: image.getBoundingClientRect().width, container: image.parentElement?.clientWidth || box.width, original: image.style.width };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const current = drag.current;
          if (!current) return;
          const width = Math.max(1, Math.min(100, Math.round((current.width + event.clientX - current.x) / current.container * 100)));
          image.style.width = `${width}%`;
          setPercent(width);
        }}
        onPointerUp={(event) => {
          if (!drag.current) return;
          const width = Math.max(1, Math.min(100, Math.round(image.getBoundingClientRect().width / drag.current.container * 100)));
          drag.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
          commit(width);
        }}
        onPointerCancel={cancel} onLostPointerCapture={cancel}
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
          event.preventDefault();
          const width = Math.max(1, Math.min(100, percent + (event.key === "ArrowRight" ? 1 : -1) * (event.shiftKey ? 10 : 1)));
          image.style.width = `${width}%`; setPercent(width); commit(width);
        }}>↘</button>
    </div>}
  </div>;
}
