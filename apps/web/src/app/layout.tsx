import type { Metadata } from "next";
import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/500.css";
import "@fontsource/quicksand/600.css";
import "@fontsource/quicksand/700.css";
import "lxgw-wenkai-webfont/lxgwwenkai-regular.css";
import "lxgw-wenkai-webfont/lxgwwenkai-bold.css";
import "./globals.css";
import { siteConfig } from "@/lib/config";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { GoToTop } from "@/components/go-to-top";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s / ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

const themeInitScript = `(function(){var t="light";try{var s=localStorage.getItem("guyong-theme-v2");if(s==="dark"||s==="light"){t=s;}}catch(e){}document.documentElement.dataset.theme=t;})();`;

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
        <SiteFooter />
        <GoToTop />
      </body>
    </html>
  );
}
