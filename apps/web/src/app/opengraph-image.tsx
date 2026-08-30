import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/config";

export const alt = `${siteConfig.name} — 技术笔记、课程学习记录与画作`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "flex-start",
          background: "#f6fbfc",
          color: "#223543",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          padding: "72px 88px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", fontSize: 88, fontWeight: 700, letterSpacing: "0.04em" }}>
          {siteConfig.name}
        </div>
        <div
          style={{
            background: "linear-gradient(90deg, #12b8c4 0%, #20d59b 55%, #f2d400 100%)",
            display: "flex",
            height: 10,
            margin: "28px 0 44px",
            width: 280,
          }}
        />
        <div style={{ color: "#496b7c", display: "flex", fontSize: 36, lineHeight: 1.5 }}>
          技术笔记 · 课程学习记录 · 少量画作
        </div>
      </div>
    ),
    size,
  );
}
