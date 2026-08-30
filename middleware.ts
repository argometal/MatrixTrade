import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { argusLegacyRedirectUrl } from "@/lib/argus/argus-legacy-redirects";
import { resolveGuestLockPolicyForMiddleware } from "@/lib/auth/guest-lock-policy-edge";
import {
  GUEST_LOCK_COOKIE,
  GUEST_LOCK_OVERRIDE_COOKIE,
  GUEST_SESSION_UNTIL_COOKIE,
  GUEST_TZ_COOKIE,
  isGuestLockWindowOpen,
  isGuestOverrideActive,
  normalizeGuestTimeZone,
  type GuestLockPolicy,
} from "@/lib/auth/guest-workstation-lock";
import { isArgusSessionPath } from "@/lib/auth/argus-session-path";
import {
  isMxtTradingPath,
  isUnderMxtBase,
  mxtPath,
  stripMxtPrefix,
} from "@/lib/mxt-paths";

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login" || pathname === "/argus/login") return true;
  if (pathname === "/apps" || pathname.startsWith("/apps/")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api/")) return true;
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)) return true;
  return false;
}

function clearSessionCookies(response: NextResponse): void {
  response.cookies.delete("mt-auth");
  response.cookies.delete("argus-auth");
  response.cookies.delete("argus-private");
  response.cookies.delete("argus-delete");
  response.cookies.delete("argus-delete-auth");
  response.cookies.delete(GUEST_SESSION_UNTIL_COOKIE);
  response.cookies.delete(GUEST_LOCK_OVERRIDE_COOKIE);
}

function guestLockBlocks(policy: GuestLockPolicy, request: NextRequest): boolean {
  if (!policy.enabled) return false;

  const timeZone = normalizeGuestTimeZone(request.cookies.get(GUEST_TZ_COOKIE)?.value);

  const override = request.cookies.get(GUEST_LOCK_OVERRIDE_COOKIE)?.value;
  if (isGuestOverrideActive(override)) {
    const until = request.cookies.get(GUEST_SESSION_UNTIL_COOKIE)?.value;
    if (until) {
      const ts = Date.parse(until);
      if (Number.isFinite(ts) && Date.now() > ts) return true;
    }
    return false;
  }

  if (!isGuestLockWindowOpen(policy, new Date(), timeZone)) return true;
  const until = request.cookies.get(GUEST_SESSION_UNTIL_COOKIE)?.value;
  if (!until) return true;
  const ts = Date.parse(until);
  if (!Number.isFinite(ts) || Date.now() > ts) return true;
  return false;
}

export async function middleware(request: NextRequest) {
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

  // Neutral product root — not MXT.
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/apps", request.url));
  }

  // Legacy unprefixed trading URLs → canonical /mta/* (belt; next.config also redirects).
  if (isMxtTradingPath(pathname) && !isUnderMxtBase(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = mxtPath(pathname);
    return NextResponse.redirect(url);
  }

  const tradingPasswordSet = Boolean(process.env.MATRIXTRADE_PASSWORD);
  const argusPasswordSet = Boolean(
    process.env.ARGUS_PASSWORD ?? process.env.HEALTH_VAULT_PASSWORD
  );

  const policy = await resolveGuestLockPolicyForMiddleware(
    request.cookies.get(GUEST_LOCK_COOKIE)?.value
  );

  if (guestLockBlocks(policy, request)) {
    const loginPath =
      isArgusSessionPath(pathname) && argusPasswordSet
        ? "/argus/login"
        : tradingPasswordSet && isMxtTradingPath(pathname)
          ? "/login"
          : tradingPasswordSet && !isArgusSessionPath(pathname)
            ? "/login"
            : null;
    if (loginPath) {
      const login = new URL(loginPath, request.url);
      login.searchParams.set("next", pathname);
      login.searchParams.set("guest_expired", "1");
      const response = NextResponse.redirect(login);
      clearSessionCookies(response);
      return response;
    }
  }

  if (tradingPasswordSet && isMxtTradingPath(pathname) && !request.cookies.get("mt-auth")?.value) {
    const inner = stripMxtPrefix(pathname);
    const isSharedSecurity =
      inner === "/settings/security" || inner.startsWith("/settings/security/");
    if (!(isSharedSecurity && request.cookies.get("argus-auth")?.value)) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
  }

  if (argusPasswordSet && isArgusSessionPath(pathname) && !request.cookies.get("argus-auth")?.value) {
    const login = new URL("/argus/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
