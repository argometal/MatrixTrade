import { cookies } from "next/headers";
import { createSessionToken, verifySessionToken } from "./session-token";

export const MT_AUTH = "mt-auth";
export const HV_AUTH = "hv-auth";
export const HV_SECRET = "hv-secret";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const SECRET_MAX_AGE = 60 * 60;

export async function setTradingSession(): Promise<void> {
  const token = createSessionToken("mt-auth");
  if (!token) throw new Error("MATRIXTRADE_PASSWORD is not configured");
  const jar = await cookies();
  jar.set(MT_AUTH, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function setHealthSession(): Promise<void> {
  const token = createSessionToken("hv-auth");
  if (!token) throw new Error("HEALTH_VAULT_TOTP_SECRET is not configured");
  const jar = await cookies();
  jar.set(HV_AUTH, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function setHealthSecretUnlock(): Promise<void> {
  const token = createSessionToken("hv-secret");
  if (!token) throw new Error("Health Vault secret unlock is not configured");
  const jar = await cookies();
  jar.set(HV_SECRET, token, {
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
  return verifySessionToken("mt-auth", jar.get(MT_AUTH)?.value);
}

export async function hasHealthSession(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken("hv-auth", jar.get(HV_AUTH)?.value);
}

export async function hasHealthSecretUnlock(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken("hv-secret", jar.get(HV_SECRET)?.value);
}
