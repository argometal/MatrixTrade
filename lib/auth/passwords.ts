import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyTradingPassword(input: string): boolean {
  const expected = process.env.MATRIXTRADE_PASSWORD ?? "";
  if (!expected) return true;
  return safeEqual(input, expected);
}

export function verifyHealthPassword(input: string): boolean {
  const expected = process.env.HEALTH_VAULT_PASSWORD ?? "";
  if (!expected) return true;
  return safeEqual(input, expected);
}

export function verifyHealthSecret(input: string): boolean {
  const expected = process.env.HEALTH_VAULT_SECRET ?? "";
  if (!expected) return false;
  return safeEqual(input, expected);
}

export function tradingAuthRequired(): boolean {
  return Boolean(process.env.MATRIXTRADE_PASSWORD);
}

export function healthAuthRequired(): boolean {
  return Boolean(process.env.HEALTH_VAULT_PASSWORD);
}

export function healthSecretConfigured(): boolean {
  return Boolean(process.env.HEALTH_VAULT_SECRET);
}
