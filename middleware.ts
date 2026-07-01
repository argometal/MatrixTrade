import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isHealthEnvConfigured, isTradingEnvConfigured } from "@/lib/auth/env";
import { HV_AUTH, MT_AUTH } from "@/lib/auth/cookies";
import { verifySessionTokenEdge } from "@/lib/auth/session-token-edge";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isTradingRoute =
    pathname === "/" ||
    pathname.startsWith("/trades") ||
    pathname.startsWith("/connect");

  const isHealthAppRoute = pathname.startsWith("/health") && pathname !== "/health/login";
  const isHealthFileRoute = pathname.startsWith("/api/health-vault/files/");

  if (isTradingRoute) {
    if (!isTradingEnvConfigured()) {
      const login = new URL("/login", request.url);
      login.searchParams.set("config", "trading");
      if (pathname !== "/login") {
        login.searchParams.set("next", pathname);
        return NextResponse.redirect(login);
      }
      return NextResponse.next();
    }

    if (pathname !== "/login") {
      const token = request.cookies.get(MT_AUTH)?.value;
      if (!(await verifySessionTokenEdge("mt-auth", token))) {
        const login = new URL("/login", request.url);
        login.searchParams.set("next", pathname);
        return NextResponse.redirect(login);
      }
    }
  }

  if (isHealthAppRoute || isHealthFileRoute) {
    if (!isHealthEnvConfigured()) {
      const login = new URL("/health/login", request.url);
      login.searchParams.set("config", "health");
      return NextResponse.redirect(login);
    }

    const token = request.cookies.get(HV_AUTH)?.value;
    if (!(await verifySessionTokenEdge("hv-auth", token))) {
      return NextResponse.redirect(new URL("/health/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/trades/:path*", "/connect/:path*", "/health/:path*", "/api/health-vault/files/:path*"],
};
