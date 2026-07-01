import { timingSafeEqual } from "crypto";
import { isHealthEnvConfigured, isTradingEnvConfigured } from "./env";

function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyTradingPassword(input: string): boolean {
  const expected = process.env.MATRIXTRADE_PASSWORD?.trim() ?? "";
  if (!expected) return false;
  return safeEqual(input, expected);
}

export function verifyHealthPassword(input: string): boolean {
  const expected = process.env.HEALTH_VAULT_PASSWORD?.trim() ?? "";
  if (!expected) return false;
  return safeEqual(input, expected);
}

export function verifyHealthSecret(input: string): boolean {
  const expected = process.env.HEALTH_VAULT_SECRET?.trim() ?? "";
  if (!expected) return false;
  return safeEqual(input, expected);
}

/** Auth is always required when env is configured; fail closed if missing. */
export function tradingAuthRequired(): boolean {
  return isTradingEnvConfigured();
}

/** Auth is always required when env is configured; fail closed if missing. */
export function healthAuthRequired(): boolean {
  return isHealthEnvConfigured();
}

export function healthSecretConfigured(): boolean {
  return Boolean(process.env.HEALTH_VAULT_SECRET?.trim());
}
