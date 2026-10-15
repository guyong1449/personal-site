"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Thin footer strip: copyright and utility links only.
export function SiteFooter() {
  const pathname = usePathname();
  const searchActive = pathname === "/search";
  const archiveActive = pathname === "/archive";

  return (
    <footer className="site-footer">
      <div className="site-shell site-footer__inner">
        <span className="site-footer__copy">
          © {new Date().getFullYear()} <span className="font-family-en" lang="en">GUYONG</span>
        </span>
        <div className="site-footer__right">
          <span className="site-footer__divider" aria-hidden="true" />
          <Link href="/archive" className={archiveActive ? "is-active" : undefined}>
            <span className="font-family-en" lang="en">
              Archive
            </span>
          </Link>
          <span className="site-footer__divider" aria-hidden="true" />
          <Link href="/search" className={searchActive ? "is-active" : undefined}>
            <span className="font-family-en" lang="en">
              Search
            </span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
