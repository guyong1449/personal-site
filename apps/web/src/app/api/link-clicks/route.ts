import { NextRequest, NextResponse } from "next/server";
import { excludesAnalytics } from "@/lib/analytics-preferences";
import { outboundLinks } from "@/lib/outbound-links";
import { incrementLinkClick } from "@/lib/page-views";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false }, { status: 403, headers });
  }
  if (excludesAnalytics(request.headers.get("cookie") || "")) return new NextResponse(null, { status: 204, headers });
  try {
    const text = await request.text();
    if (text.length > 1024) return NextResponse.json({ ok: false }, { status: 413, headers });
    let payload;
    try { payload = JSON.parse(text); } catch { return NextResponse.json({ ok: false }, { status: 400, headers }); }
    if (!outboundLinks.some((link) => link.id === payload?.id)) {
      return NextResponse.json({ ok: false }, { status: 400, headers });
    }
    const address = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const accepted = await incrementLinkClick(payload.id, address);
    return new NextResponse(null, { status: accepted ? 204 : 429, headers });
  } catch { return NextResponse.json({ ok: false }, { status: 503, headers }); }
}
