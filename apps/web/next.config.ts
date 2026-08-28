import path from "node:path";
import type { NextConfig } from "next";

// The local Studio runs as a standalone tool on 127.0.0.1:4319. It is only
// reachable through the dev server rewrite below; production builds get an
// empty rewrite list, so https://guyong.site/studio returns 404.
async function rewrites() {
  if (process.env.NODE_ENV !== "development") {
    return [];
  }
  return [
    { source: "/studio", destination: "http://127.0.0.1:4319/studio" },
    { source: "/studio/:path*", destination: "http://127.0.0.1:4319/studio/:path*" },
  ];
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  rewrites,
  outputFileTracingIncludes: {
    "/notes/[slug]": [
      "../../content/public/metadata/notes.json",
      "../../content/public/notes/**/*",
    ],
    "/gallery/[slug]": [
      "../../content/public/metadata/gallery.json",
      "../../content/public/gallery/**/*",
    ],
  },
};

export default nextConfig;
