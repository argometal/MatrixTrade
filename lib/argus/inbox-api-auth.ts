import { NextResponse } from "next/server";

export function readBearerInboxToken(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

export function verifyInboxBearerToken(request: Request): NextResponse | null {
  const expected = process.env.ARGUS_INBOX_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "Inbox not configured" }, { status: 503 });
  }

  const token = readBearerInboxToken(request);
  if (!token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
