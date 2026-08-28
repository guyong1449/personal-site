"use client";

import Link from "next/link";
import { mainNavItems } from "./nav-data";

export function NavDesktopMenu() {
  return (
    <nav className="site-nav" aria-label="主导航">
      {mainNavItems.map((item) => (
        <Link key={item.href} href={item.href}>
          {item.title}
        </Link>
      ))}
    </nav>
  );
}
