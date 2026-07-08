import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth") || pathname === "/api/health") {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-email", session.email);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}
