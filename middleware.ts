import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const tradingPasswordSet = Boolean(process.env.MATRIXTRADE_PASSWORD);
  const healthPasswordSet = Boolean(process.env.HEALTH_VAULT_PASSWORD);

  const isTradingRoute =
    pathname === "/" ||
    pathname.startsWith("/trades") ||
    pathname.startsWith("/connect");

  if (tradingPasswordSet && isTradingRoute && !request.cookies.get("mt-auth")?.value) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (
    healthPasswordSet &&
    pathname.startsWith("/health") &&
    pathname !== "/health/login" &&
    !request.cookies.get("hv-auth")?.value
  ) {
    return NextResponse.redirect(new URL("/health/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/trades/:path*", "/connect/:path*", "/health/:path*"],
};
