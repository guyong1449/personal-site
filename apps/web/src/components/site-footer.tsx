"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/lib/config";

// The thin footer strip owns the selected-page state; the header stays plain.
export function SiteFooter() {
  const pathname = usePathname();

  return (
    <footer className="site-footer">
      <div className="site-shell site-footer__inner">
        <span className="site-footer__copy">© {new Date().getFullYear()} GUYONG</span>
        <nav className="site-footer__nav" aria-label="页脚导航">
          {siteConfig.sections.map((section) => {
            const isActive =
              pathname === section.href || pathname?.startsWith(`${section.href}/`);

            return (
              <Link
                key={section.href}
                href={section.href}
                className={isActive ? "is-active" : undefined}
                aria-current={isActive ? "page" : undefined}
              >
                {section.title}
              </Link>
            );
          })}
        </nav>
      </div>
    </footer>
  );
}
