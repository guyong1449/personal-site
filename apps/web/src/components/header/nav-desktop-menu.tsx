"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, mainNavItems } from "./nav-data";

export function NavDesktopMenu() {
  const pathname = usePathname();

  return (
    <nav className="site-nav" aria-label="主导航">
      {mainNavItems.map((item) => {
        const isActive = isNavItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={isActive ? "is-active" : undefined}
            aria-current={isActive ? "page" : undefined}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
