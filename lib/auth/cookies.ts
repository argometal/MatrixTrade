import { cookies } from "next/headers";
import {
  DEFAULT_GUEST_LOCK_POLICY,
  GUEST_LOCK_COOKIE,
  GUEST_SESSION_UNTIL_COOKIE,
  guestSessionMaxAgeSeconds,
  guestSessionUntilIso,
  parseGuestLockPolicy,
  serializeGuestLockPolicy,
  type GuestLockPolicy,
} from "@/lib/auth/guest-workstation-lock";

export const MT_AUTH = "mt-auth";
export const ARGUS_AUTH = "argus-auth";
export const ARGUS_PRIVATE = "argus-private";
export const ARGUS_DELETE = "argus-delete";
export const ARGUS_DELETE_AUTH = "argus-delete-auth";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const PRIVATE_MAX_AGE = 60 * 60;
const DELETE_MAX_AGE = 60 * 5;
const POLICY_MAX_AGE = 60 * 60 * 24 * 365;

function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export async function readGuestLockPolicy(): Promise<GuestLockPolicy> {
  const jar = await cookies();
  return parseGuestLockPolicy(jar.get(GUEST_LOCK_COOKIE)?.value) ?? { ...DEFAULT_GUEST_LOCK_POLICY };
}

export async function writeGuestLockPolicy(policy: GuestLockPolicy): Promise<void> {
  const jar = await cookies();
  if (!policy.enabled) {
    jar.delete(GUEST_LOCK_COOKIE);
    jar.delete(GUEST_SESSION_UNTIL_COOKIE);
    return;
  }
  jar.set(GUEST_LOCK_COOKIE, serializeGuestLockPolicy(policy), {
    ...cookieBase(),
    maxAge: POLICY_MAX_AGE,
  });
}

async function sessionMaxAgeSeconds(): Promise<number> {
  const policy = await readGuestLockPolicy();
  if (!policy.enabled) return SESSION_MAX_AGE;
  return guestSessionMaxAgeSeconds(policy);
}

async function stampGuestSessionUntil(): Promise<void> {
  const policy = await readGuestLockPolicy();
  if (!policy.enabled) {
    const jar = await cookies();
    jar.delete(GUEST_SESSION_UNTIL_COOKIE);
    return;
  }
  const jar = await cookies();
  const until = guestSessionUntilIso(policy);
  const maxAge = guestSessionMaxAgeSeconds(policy);
  jar.set(GUEST_SESSION_UNTIL_COOKIE, until, {
    ...cookieBase(),
    httpOnly: false,
    maxAge,
  });
}

export async function setTradingSession(): Promise<void> {
  const jar = await cookies();
  const maxAge = await sessionMaxAgeSeconds();
  jar.set(MT_AUTH, "1", {
    ...cookieBase(),
    maxAge,
  });
  await stampGuestSessionUntil();
}

export async function setArgusSession(): Promise<void> {
  const jar = await cookies();
  const maxAge = await sessionMaxAgeSeconds();
  jar.set(ARGUS_AUTH, "1", {
    ...cookieBase(),
    maxAge,
  });
  await stampGuestSessionUntil();
}

export async function setArgusPrivateUnlock(): Promise<void> {
  const jar = await cookies();
  jar.set(ARGUS_PRIVATE, "1", {
    ...cookieBase(),
    maxAge: PRIVATE_MAX_AGE,
  });
}

export async function clearArgusPrivateUnlock(): Promise<void> {
  const jar = await cookies();
  jar.delete(ARGUS_PRIVATE);
}

export async function setArgusDeleteUnlock(): Promise<void> {
  const jar = await cookies();
  jar.set(ARGUS_DELETE, "1", {
    ...cookieBase(),
    maxAge: DELETE_MAX_AGE,
  });
}

export async function setArgusDeleteAuthUnlock(): Promise<void> {
  const jar = await cookies();
  jar.set(ARGUS_DELETE_AUTH, "1", {
    ...cookieBase(),
    maxAge: DELETE_MAX_AGE,
  });
}

export async function clearArgusDeleteAuthUnlock(): Promise<void> {
  const jar = await cookies();
  jar.delete(ARGUS_DELETE_AUTH);
}

export async function clearArgusDeleteUnlock(): Promise<void> {
  const jar = await cookies();
  jar.delete(ARGUS_DELETE);
}

/** Clears trading, ARGUS, and private unlock — one logout for the whole app. */
export async function clearAllSessions(): Promise<void> {
  const jar = await cookies();
  jar.delete(MT_AUTH);
  jar.delete(ARGUS_AUTH);
  jar.delete(ARGUS_PRIVATE);
  jar.delete(ARGUS_DELETE);
  jar.delete(ARGUS_DELETE_AUTH);
  jar.delete(GUEST_SESSION_UNTIL_COOKIE);
}

export async function hasTradingSession(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(MT_AUTH)?.value === "1";
}

export async function hasArgusSession(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(ARGUS_AUTH)?.value === "1";
}

export async function hasArgusPrivateUnlock(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(ARGUS_PRIVATE)?.value === "1";
}

export async function hasArgusDeleteUnlock(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(ARGUS_DELETE)?.value === "1";
}

export async function hasArgusDeleteAuthUnlock(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(ARGUS_DELETE_AUTH)?.value === "1";
}
