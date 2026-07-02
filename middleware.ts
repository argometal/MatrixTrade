import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login" || pathname === "/argus/login") return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api/")) return true;
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)) return true;
  return false;
}

function isTradingRoute(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/trades") || pathname.startsWith("/connect");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/health" || pathname.startsWith("/health/")) {
    let next = pathname.replace(/^\/health/, "/argus");
    next = next.replace(/^\/argus\/records/, "/argus/logs");
    next = next.replace(/^\/argus\/people/, "/argus/search");
    next = next.replace(/^\/argus\/entries/, "/argus/logs");
    next = next.replace(/^\/argus\/contacts/, "/argus/search");
    return NextResponse.redirect(new URL(next, request.url));
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const tradingPasswordSet = Boolean(process.env.MATRIXTRADE_PASSWORD);
  const argusPasswordSet = Boolean(
    process.env.ARGUS_PASSWORD ?? process.env.HEALTH_VAULT_PASSWORD
  );

  if (tradingPasswordSet && isTradingRoute(pathname) && !request.cookies.get("mt-auth")?.value) {
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
