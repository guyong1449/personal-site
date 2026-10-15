import { NextRequest, NextResponse } from "next/server";
import { getPageViewStats, hasPageViewAdminAccess } from "@/lib/page-views";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
  if (!hasPageViewAdminAccess(request.headers.get("x-admin-token"))) {
    return NextResponse.json({ error: "Not Found" }, { status: 404, headers });
  }
  try {
    const stats = await getPageViewStats();
    const topPaths = Object.entries(stats.byPath).sort(([, a], [, b]) => b - a)
      .slice(0, 20).map(([path, count]) => ({ path, count }));
    return NextResponse.json({ total: stats.total, uniquePaths: Object.keys(stats.byPath).length,
      updatedAt: stats.updatedAt, topPaths }, { headers });
  } catch {
    return NextResponse.json({ error: "统计存储暂时不可用" }, { status: 503, headers });
  }
}
