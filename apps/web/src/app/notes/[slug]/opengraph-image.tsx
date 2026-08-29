import { ImageResponse } from "next/og";
import { loadEntry } from "@/lib/content";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "GUYONG note";

// Latin-only social card: og:title metadata still carries the Chinese title
// next to the image, so nothing is lost while CJK webfont loading stays out
// of the image pipeline. Satori requires explicit display on every node.
export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const note = await loadEntry("notes", slug);
  const date = note?.updated ?? note?.created ?? "";
  const tags = (note?.tags ?? []).filter((tag) => /^[\x20-\x7e]+$/.test(tag));

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
            NOTE{date ? ` · ${date}` : ""}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", width: "72px", height: "6px", background: "#16b0bf" }} />
          <div style={{ display: "flex", fontSize: 44, color: "#2e4351", letterSpacing: 1 }}>
            guyong.site/notes/{slug}
          </div>
        </div>

        {tags.length > 0 && (
          <div style={{ display: "flex", gap: "14px" }}>
            {tags.map((tag) => (
              <div
                key={tag}
                style={{
                  display: "flex",
                  padding: "8px 20px",
                  border: "1px solid #709eb3",
                  color: "#5f7d8c",
                  fontSize: 22,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    size,
  );
}
