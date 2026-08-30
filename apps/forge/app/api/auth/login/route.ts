import { NextResponse } from "next/server";
import {
  clearForgeSessionCookie,
  forgeAuthCookieOptions,
  FORGE_AUTH,
  safeForgeReturnPath,
  verifyForgePassword,
} from "@/lib/auth/session";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const next = safeForgeReturnPath(String(form.get("next") ?? "/forge"));

  if (!verifyForgePassword(password)) {
    return NextResponse.redirect(
      new URL(`/login?error=1&next=${encodeURIComponent(next)}`, request.url),
      303
    );
  }

  const res = NextResponse.redirect(new URL(next, request.url), 303);
  res.cookies.set(FORGE_AUTH, "1", forgeAuthCookieOptions());
  return res;
}

export async function DELETE(request: Request) {
  const res = NextResponse.redirect(new URL("/login", request.url), 303);
  clearForgeSessionCookie(res);
  return res;
}
