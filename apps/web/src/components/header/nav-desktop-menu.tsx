"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNavItems } from "./nav-data";

export function NavDesktopMenu() {
  const pathname = usePathname();

  return (
    <nav className="site-nav" aria-label="主导航">
      {mainNavItems.map((item, index) => {
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={isActive ? "is-active" : undefined}
            aria-current={isActive ? "page" : undefined}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {item.title.toUpperCase()}
          </Link>
        );
      })}
    </nav>
  );
}
