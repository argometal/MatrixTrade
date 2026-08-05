import { cookies } from "next/headers";
import {
  DEFAULT_GUEST_LOCK_POLICY,
  GUEST_LOCK_COOKIE,
  GUEST_LOCK_OVERRIDE_COOKIE,
  GUEST_LOCK_PASSWORD_OVERRIDE_SECONDS,
  GUEST_SESSION_UNTIL_COOKIE,
  guestLoginNeedsOverride,
  guestLoginSessionSeconds,
  guestSessionUntilIso,
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

async function sessionMaxAgeSeconds(policy: GuestLockPolicy): Promise<number> {
  if (!policy.enabled) return SESSION_MAX_AGE;
  return guestLoginSessionSeconds(policy);
}

/**
 * After password login:
 * - Inside schedule → timer hours (no override cookie).
 * - Outside schedule → 30 min override, then logout again.
 */
async function stampGuestSessionUntil(policy: GuestLockPolicy): Promise<void> {
  const jar = await cookies();
  mirrorPolicyCookie(jar, policy);

  if (!policy.enabled) {
    jar.delete(GUEST_SESSION_UNTIL_COOKIE);
    jar.delete(GUEST_LOCK_OVERRIDE_COOKIE);
    return;
  }

  const maxAge = guestLoginSessionSeconds(policy);
  const until = guestSessionUntilIso(policy);
  jar.set(GUEST_SESSION_UNTIL_COOKIE, until, {
    ...cookieBase(),
    httpOnly: false,
    maxAge,
  });

  if (guestLoginNeedsOverride(policy)) {
    jar.set(GUEST_LOCK_OVERRIDE_COOKIE, until, {
      ...cookieBase(),
      maxAge: GUEST_LOCK_PASSWORD_OVERRIDE_SECONDS,
    });
  } else {
    jar.delete(GUEST_LOCK_OVERRIDE_COOKIE);
  }
}

export async function setTradingSession(): Promise<void> {
  const policy = await readGuestLockPolicy();
  const jar = await cookies();
  const maxAge = await sessionMaxAgeSeconds(policy);
  jar.set(MT_AUTH, "1", {
    ...cookieBase(),
    maxAge: Math.max(60, maxAge),
  });
  await stampGuestSessionUntil(policy);
}

export async function setArgusSession(): Promise<void> {
  const policy = await readGuestLockPolicy();
  const jar = await cookies();
  const maxAge = await sessionMaxAgeSeconds(policy);
  jar.set(ARGUS_AUTH, "1", {
    ...cookieBase(),
    maxAge: Math.max(60, maxAge),
  });
  await stampGuestSessionUntil(policy);
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
