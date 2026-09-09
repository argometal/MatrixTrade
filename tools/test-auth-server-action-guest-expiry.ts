/**
 * Guest-lock auth regression:
 * - normal navigation/POST still redirects on expired guest session
 * - Server Action POST is allowed through middleware so action-level auth can redirect correctly
 *
 * Run: npx tsx tools/test-auth-server-action-guest-expiry.ts
 */
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";
import { __clearGuestLockPolicyEdgeCache } from "../lib/auth/guest-lock-policy-edge";

function buildCookieHeader(entries: Record<string, string>): string {
  return Object.entries(entries)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("; ");
}

function buildExpiredGuestCookies(): string {
  return buildCookieHeader({
    "mt-auth": "1",
    "guest-tz": "America/Chicago",
    "guest-lock-policy": JSON.stringify({
      enabled: true,
      hours: 4,
      indefinite: true,
    }),
    "guest-session-until": "2000-01-01T00:00:00.000Z",
  });
}

async function main() {
  process.env.MATRIXTRADE_PASSWORD = "test-password";
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  __clearGuestLockPolicyEdgeCache();

  const expiredCookies = buildExpiredGuestCookies();

  const getReq = new NextRequest("https://example.com/mxt/stats?tab=pipeline", {
    headers: { cookie: expiredCookies },
  });
  const getRes = await middleware(getReq);
  assert.ok(getRes, "GET should produce a middleware response");
  assert.equal(getRes?.status, 307);
  assert.match(getRes?.headers.get("location") ?? "", /\/login\?next=.*guest_expired=1/);
  const getSetCookie = getRes?.headers.get("set-cookie") ?? "";
  assert.match(getSetCookie, /mt-auth=;/);
  assert.match(getSetCookie, /guest-session-until=;/);

  __clearGuestLockPolicyEdgeCache();
  const actionReq = new NextRequest("https://example.com/mxt/stats?tab=pipeline", {
    method: "POST",
    headers: {
      cookie: expiredCookies,
      "next-action": "test-action-id",
    },
  });
  const actionRes = await middleware(actionReq);
  assert.ok(actionRes, "Server Action POST should return NextResponse.next()");
  assert.equal(actionRes?.status, 200);
  assert.equal(actionRes?.headers.get("location"), null);
  assert.equal(actionRes?.headers.get("set-cookie"), null);

  __clearGuestLockPolicyEdgeCache();
  const plainPostReq = new NextRequest("https://example.com/mxt/stats?tab=pipeline", {
    method: "POST",
    headers: { cookie: expiredCookies },
  });
  const plainPostRes = await middleware(plainPostReq);
  assert.ok(plainPostRes, "Non-server-action POST should still redirect");
  assert.equal(plainPostRes?.status, 307);
  assert.match(plainPostRes?.headers.get("location") ?? "", /guest_expired=1/);

  console.log("test-auth-server-action-guest-expiry: PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
