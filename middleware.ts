import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { argusLegacyRedirectUrl } from "@/lib/argus/argus-legacy-redirects";
import {
  GUEST_LOCK_COOKIE,
  GUEST_SESSION_UNTIL_COOKIE,
  isGuestLockWindowOpen,
  parseGuestLockPolicy,
} from "@/lib/auth/guest-workstation-lock";

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login" || pathname === "/argus/login") return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api/")) return true;
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)) return true;
  return false;
}

function isTradingRoute(pathname: string): boolean {
  if (pathname === "/") return true;

  const prefixes = [
    "/home-preview",
    "/trades-preview",
    "/trades",
    "/connect",
    "/inbox",
    "/exchange",
    "/ai-bridge",
    "/ai-workspace",
    "/planning",
    "/playbook",
    "/review",
    "/journal",
    "/system",
    "/stats",
    "/mistakes",
    "/planning",
    "/stock-theses",
    "/scout-access",
    "/settings",
  ];

  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function clearSessionCookies(response: NextResponse): void {
  response.cookies.delete("mt-auth");
  response.cookies.delete("argus-auth");
  response.cookies.delete("argus-private");
  response.cookies.delete("argus-delete");
  response.cookies.delete("argus-delete-auth");
  response.cookies.delete(GUEST_SESSION_UNTIL_COOKIE);
}

function guestLockBlocks(request: NextRequest): boolean {
  const policy = parseGuestLockPolicy(request.cookies.get(GUEST_LOCK_COOKIE)?.value);
  if (!policy?.enabled) return false;
  if (!isGuestLockWindowOpen(policy)) return true;
  const until = request.cookies.get(GUEST_SESSION_UNTIL_COOKIE)?.value;
  if (until) {
    const ts = Date.parse(until);
    if (Number.isFinite(ts) && Date.now() > ts) return true;
  }
  return false;
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

  const argusLegacy = argusLegacyRedirectUrl(request);
  if (argusLegacy) {
    return NextResponse.redirect(argusLegacy);
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/home-preview", request.url));
  }

  const tradingPasswordSet = Boolean(process.env.MATRIXTRADE_PASSWORD);
  const argusPasswordSet = Boolean(
    process.env.ARGUS_PASSWORD ?? process.env.HEALTH_VAULT_PASSWORD
  );

  if (guestLockBlocks(request)) {
    const loginPath =
      pathname.startsWith("/argus") && argusPasswordSet
        ? "/argus/login"
        : tradingPasswordSet
          ? "/login"
          : null;
    if (loginPath) {
      const login = new URL(loginPath, request.url);
      if (loginPath === "/login") login.searchParams.set("next", pathname);
      login.searchParams.set("guest_expired", "1");
      const response = NextResponse.redirect(login);
      clearSessionCookies(response);
      return response;
    }
  }

  if (tradingPasswordSet && isTradingRoute(pathname) && !request.cookies.get("mt-auth")?.value) {
    // Shared security settings: allow Argus session so guest lock is reachable from Argus
    const isSharedSecurity =
      pathname === "/settings/security" || pathname.startsWith("/settings/security/");
    if (!(isSharedSecurity && request.cookies.get("argus-auth")?.value)) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
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
