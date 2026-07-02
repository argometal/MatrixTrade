import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/health" || pathname.startsWith("/health/")) {
    let next = pathname.replace(/^\/health/, "/argus");
    next = next.replace(/^\/argus\/records/, "/argus/entries");
    next = next.replace(/^\/argus\/people/, "/argus/contacts");
    return NextResponse.redirect(new URL(next, request.url));
  }

  const tradingPasswordSet = Boolean(process.env.MATRIXTRADE_PASSWORD);
  const argusPasswordSet = Boolean(
    process.env.ARGUS_PASSWORD ?? process.env.HEALTH_VAULT_PASSWORD
  );

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
    argusPasswordSet &&
    pathname.startsWith("/argus") &&
    pathname !== "/argus/login" &&
    !request.cookies.get("argus-auth")?.value
  ) {
    return NextResponse.redirect(new URL("/argus/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/trades/:path*", "/connect/:path*", "/argus/:path*"],
};
