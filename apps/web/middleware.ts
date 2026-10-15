import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const EXPECTED_TOKEN = process.env.PAGE_VIEWS_ADMIN_TOKEN;
const ADMIN_PATH_PREFIXES = ["/admin/page-views", "/api/admin/page-views"];

function isAdminPath(pathname: string): boolean {
  return ADMIN_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function getAdminToken(request: NextRequest): string | null {
  return request.headers.get("x-admin-token");
}

function hasAdminAccess(token: string | null): boolean {
  if (!EXPECTED_TOKEN) {
    return false;
  }
  return token === EXPECTED_TOKEN;
}

export function middleware(request: NextRequest) {
  if (!isAdminPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (hasAdminAccess(getAdminToken(request))) {
    return NextResponse.next();
  }

  return new NextResponse("Not Found", { status: 404 });
}

export const config = {
  matcher: ["/admin/page-views/:path*", "/api/admin/page-views/:path*"],
};
