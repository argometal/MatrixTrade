/**
 * DISABLED BY DESIGN — see lib/ai-session-disabled.ts
 * Blocked by ChatGPT platform capability, not by MatrixTrade.
 */
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

function hostFromUrlOrHost(input: string): string {
  const trimmed = input.trim().replace(/\/$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return new URL(trimmed).hostname;
  }
  return trimmed.split("/")[0]!;
}

function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim().replace(/\/$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/** Vercel preview deployment hosts — may require Vercel Authentication. */
function looksLikeVercelPreviewDeployment(host: string): boolean {
  if (!host.endsWith(".vercel.app")) return false;
  if (host.includes("-git-")) return true;
  if (host.includes("-projects.vercel.app")) return true;
  return false;
}

/**
 * Public base URL for AI session QR / connect links.
 * Always prefers production — never a Vercel preview deployment URL.
 */
export function getPublicAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    const host = hostFromUrlOrHost(explicit);
    if (!looksLikeVercelPreviewDeployment(host)) {
      return normalizeBaseUrl(explicit);
    }
  }

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) {
    return normalizeBaseUrl(productionHost);
  }

  const vercelEnv = process.env.VERCEL_ENV?.trim();
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelEnv === "production" && vercelUrl) {
    const host = hostFromUrlOrHost(vercelUrl);
    if (!looksLikeVercelPreviewDeployment(host)) {
      return normalizeBaseUrl(vercelUrl);
    }
  }

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
