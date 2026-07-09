import { cookies } from "next/headers";

export const MT_AUTH = "mt-auth";
export const ARGUS_AUTH = "argus-auth";
export const ARGUS_PRIVATE = "argus-private";
export const ARGUS_DELETE = "argus-delete";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const PRIVATE_MAX_AGE = 60 * 60;
const DELETE_MAX_AGE = 60 * 5;

export async function setTradingSession(): Promise<void> {
  const jar = await cookies();
  jar.set(MT_AUTH, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function setArgusSession(): Promise<void> {
  const jar = await cookies();
  jar.set(ARGUS_AUTH, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function setArgusPrivateUnlock(): Promise<void> {
  const jar = await cookies();
  jar.set(ARGUS_PRIVATE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: PRIVATE_MAX_AGE,
    path: "/",
  });
}

export async function clearArgusPrivateUnlock(): Promise<void> {
  const jar = await cookies();
  jar.delete(ARGUS_PRIVATE);
}

export async function setArgusDeleteUnlock(): Promise<void> {
  const jar = await cookies();
  jar.set(ARGUS_DELETE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: DELETE_MAX_AGE,
    path: "/",
  });
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
