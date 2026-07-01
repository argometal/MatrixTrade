import type { SessionPurpose } from "./session-token";

function signingKey(purpose: SessionPurpose): string | null {
  switch (purpose) {
    case "mt-auth":
      return process.env.MATRIXTRADE_PASSWORD?.trim() || null;
    case "hv-auth":
      return process.env.HEALTH_VAULT_PASSWORD?.trim() || null;
    case "hv-secret":
      return process.env.HEALTH_VAULT_SECRET?.trim() || null;
  }
}

async function hmacBase64Url(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Buffer.from(sig).toString("base64url");
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifySessionTokenEdge(
  purpose: SessionPurpose,
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;
  const key = signingKey(purpose);
  if (!key) return false;

  const dot = token.indexOf(".");
  if (dot <= 0) return false;

  const expStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  const expected = await hmacBase64Url(key, `${purpose}:${exp}`);
  return timingSafeEqualStr(sig, expected);
}
