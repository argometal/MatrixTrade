import { createHash, randomBytes } from "crypto";

const TOKEN_PREFIX = "mtai_";

export function generateAiSessionToken(): string {
  return `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashAiSessionToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function isAiSessionTokenFormat(token: string): boolean {
  return token.startsWith(TOKEN_PREFIX) && token.length > TOKEN_PREFIX.length + 16;
}
