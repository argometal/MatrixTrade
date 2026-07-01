import { authenticator } from "otplib";

authenticator.options = { window: 1 };

export function getHealthTotpSecret(): string | null {
  const secret = process.env.HEALTH_VAULT_TOTP_SECRET?.trim();
  return secret || null;
}

export function normalizeTotpCode(input: string): string {
  return input.replace(/\s/g, "").trim();
}

export function isValidTotpFormat(code: string): boolean {
  return /^\d{6}$/.test(code);
}

export function verifyHealthTotp(input: string): boolean {
  const secret = getHealthTotpSecret();
  if (!secret) return false;
  const code = normalizeTotpCode(input);
  if (!isValidTotpFormat(code)) return false;
  try {
    return authenticator.verify({ token: code, secret });
  } catch {
    return false;
  }
}
