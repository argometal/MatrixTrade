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

export function verifyArgusPassword(input: string): boolean {
  const expected =
    process.env.ARGUS_PASSWORD ?? process.env.HEALTH_VAULT_PASSWORD ?? "";
  if (!expected) return true;
  return safeEqual(input, expected);
}

export function verifyArgusPrivatePin(input: string): boolean {
  const expected =
    process.env.ARGUS_PRIVATE_PIN ?? process.env.HEALTH_VAULT_SECRET ?? "";
  if (!expected) return false;
  return safeEqual(input, expected);
}

/** Shorter code for deleting unlinked inbox items (falls back to private PIN). */
export function verifyDeletionCode(input: string): boolean {
  const expected =
    process.env.ARGUS_DELETE_CODE ??
    process.env.ARGUS_PRIVATE_PIN ??
    process.env.HEALTH_VAULT_SECRET ??
    "";
  if (!expected) return false;
  return safeEqual(input, expected);
}

export function argusDeleteCodeConfigured(): boolean {
  return Boolean(
    process.env.ARGUS_DELETE_CODE ??
      process.env.ARGUS_PRIVATE_PIN ??
      process.env.HEALTH_VAULT_SECRET
  );
}

export function tradingAuthRequired(): boolean {
  return Boolean(process.env.MATRIXTRADE_PASSWORD);
}

export function argusAuthRequired(): boolean {
  return Boolean(process.env.ARGUS_PASSWORD ?? process.env.HEALTH_VAULT_PASSWORD);
}

export function argusPrivateConfigured(): boolean {
  return Boolean(process.env.ARGUS_PRIVATE_PIN ?? process.env.HEALTH_VAULT_SECRET);
}
