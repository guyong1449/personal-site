import Link from "next/link";
import { siteConfig } from "@/lib/config";
import { NavDesktopMenu } from "./nav-desktop-menu";
import { NavMobileMenu } from "./nav-mobile-menu";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  return (
    <header className="site-header">
      <div className="site-shell site-header__inner">
        <Link href="/" className="site-brand" aria-label={`${siteConfig.name} 首页`}>
          <span className="site-brand__mark" aria-hidden="true" />
          <span>{siteConfig.name}</span>
        </Link>

        <div className="site-header__end">
          <NavDesktopMenu />
          <ThemeToggle />
          <NavMobileMenu />
        </div>
      </div>
    </header>
  );
}
