"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Thin footer strip: copyright, a vertical divider, then the only utility
// link. The main section links live in the header, not here.
export function SiteFooter() {
  const pathname = usePathname();
  const searchActive = pathname === "/search";
  const archiveActive = pathname === "/archive";

  return (
    <footer className="site-footer">
      <div className="site-shell site-footer__inner">
        <span className="site-footer__copy">© {new Date().getFullYear()} GUYONG</span>
        <div className="site-footer__right">
          <span className="site-footer__divider" aria-hidden="true" />
          <Link href="/archive" className={archiveActive ? "is-active" : undefined}>
            Archive
          </Link>
          <span className="site-footer__divider" aria-hidden="true" />
          <Link href="/search" className={searchActive ? "is-active" : undefined}>
            Search
          </Link>
        </div>
      </div>
    </footer>
  );
}
