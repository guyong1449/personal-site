"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { studioParentOrigin } from "@/lib/studio-parent";

export function StudioBridge() {
  const pathname = usePathname();
  useEffect(() => {
    const origin = studioParentOrigin();
    if (!origin) return;
    const report = () => window.parent.postMessage({ type: "studio:route", pathname }, origin);
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== origin) return;
      if (event.data?.type === "studio:theme" && ["light", "dark"].includes(event.data.theme)) {
        document.documentElement.dataset.theme = event.data.theme;
        localStorage.setItem("guyong-theme-v2", event.data.theme);
      }
    };
    const observer = new MutationObserver(() => window.parent.postMessage({
      type: "studio:theme", theme: document.documentElement.dataset.theme,
    }, origin));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener("message", receive);
    report();
    return () => { observer.disconnect(); window.removeEventListener("message", receive); };
  }, [pathname]);
  return null;
}
