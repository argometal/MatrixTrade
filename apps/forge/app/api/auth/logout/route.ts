import { NextResponse } from "next/server";
import { clearForgeSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  const res = NextResponse.redirect(new URL("/login", request.url), 303);
  clearForgeSessionCookie(res);
  return res;
}
