import { createHmac, timingSafeEqual } from "crypto";

export type SessionPurpose = "mt-auth" | "hv-auth" | "hv-secret";

const MAX_AGE: Record<SessionPurpose, number> = {
  "mt-auth": 60 * 60 * 24 * 7,
  "hv-auth": 60 * 60 * 24 * 7,
  "hv-secret": 60 * 60,
};

function signingKey(purpose: SessionPurpose): string | null {
  switch (purpose) {
    case "mt-auth":
      return process.env.MATRIXTRADE_PASSWORD?.trim() || null;
    case "hv-auth":
      return process.env.HEALTH_VAULT_TOTP_SECRET?.trim() || null;
    case "hv-secret":
      return (
        process.env.HEALTH_VAULT_SECRET?.trim() ||
        process.env.HEALTH_VAULT_TOTP_SECRET?.trim() ||
        null
      );
  }
}

function sign(purpose: SessionPurpose, exp: number, key: string): string {
  const payload = `${purpose}:${exp}`;
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function createSessionToken(purpose: SessionPurpose): string | null {
  const key = signingKey(purpose);
  if (!key) return null;
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE[purpose];
  return `${exp}.${sign(purpose, exp, key)}`;
}

export function verifySessionToken(purpose: SessionPurpose, token: string | undefined): boolean {
  if (!token) return false;
  const key = signingKey(purpose);
  if (!key) return false;

  const dot = token.indexOf(".");
  if (dot <= 0) return false;

  const expStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  const expected = sign(purpose, exp, key);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
