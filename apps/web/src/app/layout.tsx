import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/lib/config";
import { Header } from "@/components/header";
import { GoToTop } from "@/components/go-to-top";

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={siteConfig.locale}>
      <body className="min-h-screen">
        <Header />
        {children}
        <footer className="border-t border-[var(--line)] bg-[var(--panel)]">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <p className="text-sm text-[rgba(34,27,22,0.6)]">
                © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
              </p>
              <div className="flex gap-4">
                {siteConfig.sections.map((section) => (
                  <a
                    key={section.href}
                    href={section.href}
                    className="text-sm text-[rgba(34,27,22,0.6)] hover:text-[var(--accent)] transition-colors"
                  >
                    {section.title}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </footer>
        <GoToTop />
      </body>
    </html>
  );
}
