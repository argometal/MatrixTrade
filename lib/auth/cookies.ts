import { cookies } from "next/headers";
import {
  DEFAULT_GUEST_LOCK_POLICY,
  GUEST_LOCK_COOKIE,
  GUEST_LOCK_OVERRIDE_COOKIE,
  GUEST_LOCK_PASSWORD_OVERRIDE_SECONDS,
  GUEST_SESSION_UNTIL_COOKIE,
  GUEST_TZ_COOKIE,
  guestLoginNeedsOverride,
  guestLoginSessionSeconds,
  guestSessionUntilIso,
  normalizeGuestTimeZone,
  parseGuestLockPolicy,
  serializeGuestLockPolicy,
  type GuestLockPolicy,
} from "@/lib/auth/guest-workstation-lock";
import {
  readGuestLockPolicyFromStore,
  writeGuestLockPolicyToStore,
} from "@/lib/guest-lock-policy-store";

export const MT_AUTH = "mt-auth";
export const ARGUS_AUTH = "argus-auth";
export const ARGUS_PRIVATE = "argus-private";
export const ARGUS_DELETE = "argus-delete";
export const ARGUS_DELETE_AUTH = "argus-delete-auth";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const PRIVATE_MAX_AGE = 60 * 60;
const DELETE_MAX_AGE = 60 * 5;
const POLICY_MAX_AGE = 60 * 60 * 24 * 365;
const TZ_MAX_AGE = 60 * 60 * 24 * 365;

function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

function mirrorPolicyCookie(jar: Awaited<ReturnType<typeof cookies>>, policy: GuestLockPolicy): void {
  if (!policy.enabled) {
    jar.delete(GUEST_LOCK_COOKIE);
    return;
  }
  jar.set(GUEST_LOCK_COOKIE, serializeGuestLockPolicy(policy), {
    ...cookieBase(),
    maxAge: POLICY_MAX_AGE,
  });
}

export async function readGuestTimeZone(): Promise<string | undefined> {
  const jar = await cookies();
  return normalizeGuestTimeZone(jar.get(GUEST_TZ_COOKIE)?.value);
}

/** Persist browser IANA timezone for schedule evaluation (readable by JS + middleware). */
export async function writeGuestTimeZone(raw: string | undefined | null): Promise<string | undefined> {
  const tz = normalizeGuestTimeZone(raw);
  if (!tz) return undefined;
  const jar = await cookies();
  jar.set(GUEST_TZ_COOKIE, tz, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TZ_MAX_AGE,
  });
  return tz;
}

/** Canonical account policy (Supabase/json). Cookie used only as migration fallback. */
export async function readGuestLockPolicy(): Promise<GuestLockPolicy> {
  try {
    return await readGuestLockPolicyFromStore();
  } catch {
    const jar = await cookies();
    return parseGuestLockPolicy(jar.get(GUEST_LOCK_COOKIE)?.value) ?? { ...DEFAULT_GUEST_LOCK_POLICY };
  }
}

export async function writeGuestLockPolicy(policy: GuestLockPolicy): Promise<void> {
  await writeGuestLockPolicyToStore(policy);
  const jar = await cookies();
  if (!policy.enabled) {
    jar.delete(GUEST_LOCK_COOKIE);
    jar.delete(GUEST_SESSION_UNTIL_COOKIE);
    jar.delete(GUEST_LOCK_OVERRIDE_COOKIE);
    return;
  }
  mirrorPolicyCookie(jar, policy);
}

async function sessionMaxAgeSeconds(policy: GuestLockPolicy, timeZone?: string): Promise<number> {
  if (!policy.enabled) return SESSION_MAX_AGE;
  return guestLoginSessionSeconds(policy, new Date(), timeZone);
}

/**
 * After password login:
 * - Inside schedule → timer hours (no override cookie).
 * - Outside schedule → 30 min override, then logout again.
 */
async function stampGuestSessionUntil(policy: GuestLockPolicy, timeZone?: string): Promise<void> {
  const jar = await cookies();
  mirrorPolicyCookie(jar, policy);

  if (!policy.enabled) {
    jar.delete(GUEST_SESSION_UNTIL_COOKIE);
    jar.delete(GUEST_LOCK_OVERRIDE_COOKIE);
    return;
  }

  const tz = timeZone ?? (await readGuestTimeZone());
  const maxAge = guestLoginSessionSeconds(policy, new Date(), tz);
  const until = guestSessionUntilIso(policy, new Date(), tz);
  jar.set(GUEST_SESSION_UNTIL_COOKIE, until, {
    ...cookieBase(),
    httpOnly: false,
    maxAge,
  });

  if (guestLoginNeedsOverride(policy, new Date(), tz)) {
    jar.set(GUEST_LOCK_OVERRIDE_COOKIE, until, {
      ...cookieBase(),
      maxAge: GUEST_LOCK_PASSWORD_OVERRIDE_SECONDS,
    });
  } else {
    jar.delete(GUEST_LOCK_OVERRIDE_COOKIE);
  }
}

export async function setTradingSession(timeZone?: string): Promise<void> {
  const policy = await readGuestLockPolicy();
  const jar = await cookies();
  const tz = (await writeGuestTimeZone(timeZone)) ?? (await readGuestTimeZone());
  const maxAge = await sessionMaxAgeSeconds(policy, tz);
  jar.set(MT_AUTH, "1", {
    ...cookieBase(),
    maxAge: Math.max(60, maxAge),
  });
  await stampGuestSessionUntil(policy, tz);
}

export async function setArgusSession(timeZone?: string): Promise<void> {
  const policy = await readGuestLockPolicy();
  const jar = await cookies();
  const tz = (await writeGuestTimeZone(timeZone)) ?? (await readGuestTimeZone());
  const maxAge = await sessionMaxAgeSeconds(policy, tz);
  jar.set(ARGUS_AUTH, "1", {
    ...cookieBase(),
    maxAge: Math.max(60, maxAge),
  });
  await stampGuestSessionUntil(policy, tz);
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

/** Clears trading, ARGUS, and private unlock — one logout for the whole app. Keeps account policy. */
export async function clearAllSessions(): Promise<void> {
  const jar = await cookies();
  jar.delete(MT_AUTH);
  jar.delete(ARGUS_AUTH);
  jar.delete(ARGUS_PRIVATE);
  jar.delete(ARGUS_DELETE);
  jar.delete(ARGUS_DELETE_AUTH);
  jar.delete(GUEST_SESSION_UNTIL_COOKIE);
  jar.delete(GUEST_LOCK_OVERRIDE_COOKIE);
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
