"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function PageViewReporter() {
  const pathname = usePathname();

  useEffect(() => {
    const currentPath = pathname || "/";
    if (process.env.NODE_ENV !== "production" || currentPath.startsWith("/admin") || currentPath.startsWith("/studio")) return;
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

  return null;
}
