import { ImageResponse } from "next/og";
import { loadEntry } from "@/lib/content";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "GUYONG gallery artwork";

// Keep the generated fallback card Latin-only; the metadata still carries the
// full artwork title while the image pipeline stays independent of CJK fonts.
export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await loadEntry("gallery", slug);
  const date = item?.updated ?? item?.created ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #f6fbfc 0%, #ddf0f2 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", width: "22px", height: "22px", background: "#16b0bf" }} />
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#24333f", letterSpacing: 2 }}>
            GUYONG
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#5f7d8c", marginLeft: "auto" }}>
            GALLERY{date ? ` · ${date}` : ""}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", width: "72px", height: "6px", background: "#16b0bf" }} />
          <div style={{ display: "flex", fontSize: 44, color: "#2e4351", letterSpacing: 1 }}>
            guyong.site/gallery/{slug}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 22, color: "#5f7d8c" }}>
          guyong.site/gallery/{slug}
        </div>
      </div>
    ),
    size,
  );
}
