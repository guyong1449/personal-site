import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
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
