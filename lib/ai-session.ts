import { isSupabaseTradesStore } from "./trades-store";
import type {
  AiSessionPublic,
  AiSessionRecord,
  CreateAiSessionOptions,
  CreateAiSessionResult,
} from "./ai-session-types";
import {
  createJsonAiSession,
  listJsonAiSessions,
  revokeJsonAiSession,
  validateJsonAiSession,
} from "./ai-session-store/json";
import {
  createSupabaseAiSession,
  listSupabaseAiSessions,
  revokeSupabaseAiSession,
  validateSupabaseAiSession,
} from "./ai-session-store/supabase";

function isSupabaseSessionStore(): boolean {
  if (isSupabaseTradesStore()) return true;
  return Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export async function createAiSession(
  options: CreateAiSessionOptions = {}
): Promise<CreateAiSessionResult> {
  if (isSupabaseSessionStore()) {
    return createSupabaseAiSession(options);
  }
  return createJsonAiSession(options);
}

export async function validateAiSession(token: string): Promise<AiSessionRecord | null> {
  if (isSupabaseSessionStore()) {
    return validateSupabaseAiSession(token);
  }
  return validateJsonAiSession(token);
}

export async function revokeAiSession(sessionId: string): Promise<boolean> {
  if (isSupabaseSessionStore()) {
    return revokeSupabaseAiSession(sessionId);
  }
  return revokeJsonAiSession(sessionId);
}

export async function listActiveAiSessions(): Promise<AiSessionPublic[]> {
  if (isSupabaseSessionStore()) {
    return listSupabaseAiSessions();
  }
  return listJsonAiSessions();
}

export function getPublicAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export function buildAiConnectUrl(token: string): string {
  const base = getPublicAppBaseUrl();
  return `${base}/api/ai/connect?t=${encodeURIComponent(token)}`;
}

export function buildAiApiManifest(baseUrl?: string) {
  const base = (baseUrl ?? getPublicAppBaseUrl()).replace(/\/$/, "");
  return {
    snapshot: `${base}/api/ai/snapshot`,
    trades: `${base}/api/ai/trades`,
    tradeById: `${base}/api/ai/trades/{id}`,
    stats: `${base}/api/ai/stats`,
    proposals: `${base}/api/ai/proposals`,
    auth: "Authorization: Bearer <session_token>",
  };
}
