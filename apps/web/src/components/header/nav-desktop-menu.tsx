"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNavItems } from "./nav-data";

export function NavDesktopMenu() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-6">
      {mainNavItems.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-sm font-medium transition-colors hover:text-[var(--accent)] ${
              isActive ? "text-[var(--accent)]" : "text-[rgba(34,27,22,0.72)]"
            }`}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
