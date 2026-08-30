import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { FORGE_AUTH } from "@/lib/auth/constants";

function forgeAuthRequired(): boolean {
  return Boolean(process.env.ARGUS_PASSWORD ?? process.env.HEALTH_VAULT_PASSWORD);
}

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api/")) return true;
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)) return true;
  return false;
}

function needsForgeAuth(pathname: string): boolean {
  if (pathname === "/forge" || pathname.startsWith("/forge/")) return true;
  if (pathname === "/") return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!forgeAuthRequired()) {
    return NextResponse.next();
  }

  if (!needsForgeAuth(pathname)) {
    return NextResponse.next();
  }

  const session = request.cookies.get(FORGE_AUTH)?.value;
  if (session === "1") {
    return NextResponse.next();
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
