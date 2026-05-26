import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={siteConfig.locale}>
      <body>{children}</body>
    </html>
  );
}
