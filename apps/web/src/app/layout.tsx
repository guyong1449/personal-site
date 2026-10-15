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
import { PageViewReporter } from "@/components/page-view-reporter";
import { GoToTop } from "@/components/go-to-top";
import { StudioBridge } from "@/components/studio-bridge";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s / ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
};

const themeInitScript = `(function(){var t="light";try{var s=localStorage.getItem("guyong-theme-v2");if(s==="dark"||s==="light"){t=s;}}catch(e){}document.documentElement.dataset.theme=t;})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={siteConfig.locale} data-theme="light" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <a href="#main-content" className="skip-link">跳到正文</a>
        <Header />
        <PageViewReporter />
        {process.env.NODE_ENV === "development" && <StudioBridge />}
        {children}
        <SiteFooter />
        <GoToTop />
      </body>
    </html>
  );
}
