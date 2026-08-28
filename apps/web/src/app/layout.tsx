import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/lib/config";
import { Header } from "@/components/header";
import { GoToTop } from "@/components/go-to-top";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s / ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

const themeInitScript = `(function(){try{var t=localStorage.getItem("guyong-theme");if(t!=="dark"&&t!=="light"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={siteConfig.locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <a href="#main-content" className="skip-link">跳到正文</a>
        <Header />
        {children}
        <footer className="site-footer">
          <div className="site-shell site-footer__inner">
            <div>
              <p className="site-footer__brand">GUYONG</p>
              <p className="site-footer__note">TEXT FIRST · IMAGE SECOND</p>
            </div>
            <div className="site-footer__links">
                {siteConfig.sections.map((section) => (
                  <a
                    key={section.href}
                    href={section.href}
                  >
                    {section.title}
                  </a>
                ))}
            </div>
            <p className="site-footer__copyright">© {new Date().getFullYear()} GUYONG</p>
          </div>
        </footer>
        <GoToTop />
      </body>
    </html>
  );
}
