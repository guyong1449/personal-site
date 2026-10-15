import { NextRequest, NextResponse } from "next/server";
import { loadIndex } from "@/lib/content";
import { incrementPageView } from "@/lib/page-views";
import { excludesAnalytics } from "@/lib/analytics-preferences";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const PUBLIC_PATHS = new Set(["/", "/notes", "/gallery", "/account", "/archive", "/search"]);

async function isPublishedPath(pathname: unknown): Promise<boolean> {
  if (typeof pathname !== "string" || pathname.length > 200) return false;
  if (PUBLIC_PATHS.has(pathname)) return true;
  const match = pathname.match(/^\/(notes|gallery)\/([a-z0-9][a-z0-9-]*)$/);
  if (!match) return false;
  const entries = await loadIndex(match[1] as "notes" | "gallery");
  return entries.some((entry) => entry.slug === match[2]);
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  if (excludesAnalytics(request.headers.get("cookie") || "")) {
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const text = await request.text();
    if (text.length > 1024) return NextResponse.json({ ok: false }, { status: 413 });
    let payload;
    try { payload = JSON.parse(text); } catch {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    if (!await isPublishedPath(payload?.pathname)) return NextResponse.json({ ok: false }, { status: 400 });
    const address = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const accepted = await incrementPageView(payload.pathname, address);
    return new NextResponse(null, { status: accepted ? 204 : 429, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
