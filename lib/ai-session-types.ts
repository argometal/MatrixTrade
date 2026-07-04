export const AI_READ_SCOPES = [
  "read:trades",
  "read:stats",
  "read:playbook",
] as const;

export const AI_WRITE_SCOPES = ["create:proposal", "create:review-proposal"] as const;

export const AI_DEFAULT_SCOPES = [...AI_READ_SCOPES, ...AI_WRITE_SCOPES] as const;

export type AiScope = (typeof AI_DEFAULT_SCOPES)[number];

export interface AiSessionRecord {
  id: string;
  tokenHash: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
  oneTime: boolean;
  usedAt?: string;
  label?: string;
}

export interface AiSessionPublic {
  id: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
  oneTime: boolean;
  label?: string;
}

export interface CreateAiSessionOptions {
  scopes?: string[];
  ttlMinutes?: number;
  oneTime?: boolean;
  label?: string;
}

export interface CreateAiSessionResult {
  token: string;
  session: AiSessionPublic;
}
