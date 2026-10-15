import { NextRequest, NextResponse } from "next/server";
import { renderMarkdownToHtml } from "@/lib/markdown/pipeline";
import { demoteMarkdownHeadings } from "@/components/markdown/markdown-components";
import { extractTocFromHtml } from "@/lib/toc";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") return new NextResponse(null, { status: 404 });
  const origin = request.headers.get("origin");
  // NextURL canonicalizes loopback hostnames to localhost in development.
  const canonicalOrigin = (value: string) => {
    const url = new URL(value);
    if (["127.0.0.1", "[::1]"].includes(url.hostname)) url.hostname = "localhost";
    return url.origin;
  };
  try {
    if (!origin || canonicalOrigin(origin) !== canonicalOrigin(request.nextUrl.origin)) return new NextResponse(null, { status: 403 });
  } catch { return new NextResponse(null, { status: 403 }); }
  const raw = await request.text();
  if (raw.length > 2_000_000) return new NextResponse(null, { status: 413 });
  try {
    const { body } = JSON.parse(raw);
    if (typeof body !== "string") return new NextResponse(null, { status: 400 });
    const html = demoteMarkdownHeadings(await renderMarkdownToHtml(body));
    return NextResponse.json({ html, toc: extractTocFromHtml(html) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return new NextResponse(null, { status: 400 }); }
}
