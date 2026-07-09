import { createHmac, timingSafeEqual } from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function base32Decode(input: string): Buffer | null {
  const cleaned = input.replace(/=+$/g, "").replace(/\s/g, "").toUpperCase();
  if (!cleaned) return null;
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx < 0) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

export function argusTotpConfigured(): boolean {
  return Boolean(process.env.ARGUS_TOTP_SECRET?.trim());
}

/** Verify a 6-digit TOTP from Google Authenticator / Authy. */
export function verifyArgusTotp(input: string, window = 1): boolean {
  const secretRaw = process.env.ARGUS_TOTP_SECRET?.trim() ?? "";
  if (!secretRaw) return false;
  const normalized = input.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const secret = base32Decode(secretRaw);
  if (!secret) return false;
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let drift = -window; drift <= window; drift += 1) {
    if (safeEqual(normalized, hotp(secret, counter + drift))) return true;
  }
  return false;
}
