import { NextRequest, NextResponse } from "next/server";
import { ANALYTICS_EXCLUDE_COOKIE } from "@/lib/analytics-preferences";

export const dynamic = "force-dynamic";

// This grants no access to statistics: anyone may opt their own browser out.
export function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("returnTo") || "/";
  const safePath = /^\/(?:[a-z0-9-]+\/?)*$/.test(path) ? path : "/";
  const response = NextResponse.redirect(new URL(safePath, request.url), 303);
  const exclude = request.nextUrl.searchParams.get("enabled") !== "0";
  const hostname = request.nextUrl.hostname;
  response.cookies.set(ANALYTICS_EXCLUDE_COOKIE, exclude ? "1" : "0", {
    path: "/", maxAge: exclude ? 365 * 24 * 60 * 60 : 0, sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    ...(["guyong.site", "www.guyong.site"].includes(hostname) ? { domain: "guyong.site" } : {}),
  });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
