/**
 * Forge session helpers shared by Route Handlers + server components.
 * Edge-safe pieces live in constants.ts; crypto stays Node-only here.
 */

import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import { FORGE_AUTH } from "@/lib/auth/constants";

export { FORGE_AUTH };

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export function forgeAuthCookieOptions() {
  const secureExplicit = process.env.FORGE_COOKIE_SECURE?.trim();
  const secure =
    secureExplicit === "1"
      ? true
      : secureExplicit === "0"
        ? false
        : process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE,
    // No Domain attribute — host-scoped only.
  };
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Matches monolith fail-open: no password env → auth not required. */
export function forgeAuthRequired(): boolean {
  return Boolean(process.env.ARGUS_PASSWORD ?? process.env.HEALTH_VAULT_PASSWORD);
}

export function verifyForgePassword(input: string): boolean {
  const expected =
    process.env.ARGUS_PASSWORD ?? process.env.HEALTH_VAULT_PASSWORD ?? "";
  if (!expected) return true;
  return safeEqual(input, expected);
}

export async function hasForgeSession(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(FORGE_AUTH)?.value === "1";
}

export async function setForgeSession(): Promise<void> {
  const jar = await cookies();
  jar.set(FORGE_AUTH, "1", forgeAuthCookieOptions());
}

export async function clearForgeSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(FORGE_AUTH);
}

export function clearForgeSessionCookie(res: NextResponse): void {
  res.cookies.set(FORGE_AUTH, "", { ...forgeAuthCookieOptions(), maxAge: 0 });
}

export function safeForgeReturnPath(next: string): string {
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return "/forge";
  }
  if (next === "/login") return "/forge";
  if (next === "/forge" || next.startsWith("/forge/")) return next;
  if (next === "/") return "/forge";
  return "/forge";
}

export async function requireForgeSession(options?: { next?: string }): Promise<void> {
  if (!forgeAuthRequired()) return;
  if (await hasForgeSession()) return;
  const next = safeForgeReturnPath(options?.next ?? "/forge");
  redirect(`/login?next=${encodeURIComponent(next)}`);
}
