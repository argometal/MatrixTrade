import { cookies } from "next/headers";

export const MT_AUTH = "mt-auth";
export const HV_AUTH = "hv-auth";
export const HV_SECRET = "hv-secret";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const SECRET_MAX_AGE = 60 * 60;

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

export async function setHealthSession(): Promise<void> {
  const jar = await cookies();
  jar.set(HV_AUTH, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function setHealthSecretUnlock(): Promise<void> {
  const jar = await cookies();
  jar.set(HV_SECRET, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SECRET_MAX_AGE,
    path: "/",
  });
}

export async function clearHealthSecretUnlock(): Promise<void> {
  const jar = await cookies();
  jar.delete(HV_SECRET);
}

export async function hasTradingSession(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(MT_AUTH)?.value === "1";
}

export async function hasHealthSession(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(HV_AUTH)?.value === "1";
}

export async function hasHealthSecretUnlock(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(HV_SECRET)?.value === "1";
}
