import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = ["/home", "/exchange", "/auction", "/chat", "/admin", "/onboard", "/book"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get("payme_session")?.value);
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (needsAuth && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/home/:path*",
    "/exchange/:path*",
    "/auction/:path*",
    "/chat/:path*",
    "/admin/:path*",
    "/onboard/:path*",
    "/book/:path*",
  ],
};
