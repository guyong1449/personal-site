"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNavItems, socialLinks } from "./nav-data";

export function NavMobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-[var(--foreground)]"
        aria-label="Toggle menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {isOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </>
          )}
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-16 z-50 bg-[var(--panel)] border-b border-[var(--line)] shadow-lg">
          <nav className="flex flex-col p-4">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`py-3 text-sm font-medium transition-colors hover:text-[var(--accent)] ${
                    isActive ? "text-[var(--accent)]" : "text-[rgba(34,27,22,0.72)]"
                  }`}
                >
                  {item.title}
                </Link>
              );
            })}

            <div className="mt-4 border-t border-[var(--line)] pt-4">
              <p className="mb-2 text-xs uppercase tracking-wider text-[rgba(34,27,22,0.6)]">
                Social
              </p>
              <div className="flex gap-4">
                {socialLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[rgba(34,27,22,0.72)] hover:text-[var(--accent)]"
                  >
                    {link.title}
                  </a>
                ))}
              </div>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
