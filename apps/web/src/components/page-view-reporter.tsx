"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { excludesAnalytics } from "@/lib/analytics-preferences";
import { findOutboundLink } from "@/lib/outbound-links";

function trackingEnabled(path: string) {
  return process.env.NODE_ENV === "production" && window.parent === window &&
    !["/admin", "/studio", "/preview", "/analytics"].some((prefix) => path.startsWith(prefix)) &&
    !excludesAnalytics(document.cookie);
}

export function PageViewReporter() {
  const pathname = usePathname();

  useEffect(() => {
    const currentPath = pathname || "/";
    if (!trackingEnabled(currentPath)) return;
    fetch("/api/page-views", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ pathname: currentPath }),
      keepalive: true,
    }).catch(() => {
      // Best-effort tracking that won't block rendering.
    });
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || !trackingEnabled(pathname || "/")) return;
      if ((event.type === "click" && event.button !== 0) || (event.type === "auxclick" && event.button !== 1)) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download")) return;
      const link = findOutboundLink(anchor.href);
      if (!link) return;
      // Keep the normal navigation immediate, including new tabs and same-tab links.
      fetch("/api/link-clicks", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: link.id }), keepalive: true,
      }).catch(() => {});
    };
    document.addEventListener("click", onClick);
    document.addEventListener("auxclick", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("auxclick", onClick);
    };
  }, [pathname]);

  return null;
}
