/**
 * DISABLED BY DESIGN — see lib/ai-session-disabled.ts
 * Blocked by ChatGPT platform capability, not by MatrixTrade.
 */
import { createSupabaseAdmin } from "../supabase/server";
import type { AiSessionPublic, AiSessionRecord, CreateAiSessionOptions } from "../ai-session-types";
import { AI_DEFAULT_SCOPES } from "../ai-session-types";
import { generateAiSessionToken, hashAiSessionToken } from "../ai-session-crypto";


interface AiSessionRow {
  id: string;
  token_hash: string;
  scopes: string[];
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  one_time: boolean;
  used_at: string | null;
  label: string | null;
}

function rowToRecord(row: AiSessionRow): AiSessionRecord {
  return {
    id: row.id,
    tokenHash: row.token_hash,
    scopes: row.scopes ?? [],
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at ?? undefined,
    revokedAt: row.revoked_at ?? undefined,
    oneTime: row.one_time,
    usedAt: row.used_at ?? undefined,
    label: row.label ?? undefined,
  };
}

function toPublic(record: AiSessionRecord): AiSessionPublic {
  return {
    id: record.id,
    scopes: record.scopes,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    lastUsedAt: record.lastUsedAt,
    revokedAt: record.revokedAt,
    oneTime: record.oneTime,
    label: record.label,
  };
}

function isActive(record: AiSessionRecord, now = Date.now()): boolean {
  if (record.revokedAt) return false;
  if (Date.parse(record.expiresAt) <= now) return false;
  if (record.oneTime && record.usedAt) return false;
  return true;
}

export async function createSupabaseAiSession(
  options: CreateAiSessionOptions = {}
): Promise<{ token: string; session: AiSessionPublic }> {
  const token = generateAiSessionToken();
  const tokenHash = hashAiSessionToken(token);
  const ttlMinutes = options.ttlMinutes ?? 60;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000).toISOString();

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_sessions")
    .insert({
      token_hash: tokenHash,
      scopes: options.scopes?.length ? options.scopes : [...AI_DEFAULT_SCOPES],
      expires_at: expiresAt,
      one_time: options.oneTime ?? false,
      label: options.label ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create AI session: ${error?.message ?? "unknown"}`);
  }

  return { token, session: toPublic(rowToRecord(data as AiSessionRow)) };
}

export async function validateSupabaseAiSession(token: string): Promise<AiSessionRecord | null> {
  const tokenHash = hashAiSessionToken(token);
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("ai_sessions")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) return null;

  const record = rowToRecord(data as AiSessionRow);
  if (!isActive(record)) return null;

  const now = new Date().toISOString();
  const updates: Partial<AiSessionRow> = { last_used_at: now };
  if (record.oneTime) {
    updates.used_at = now;
  }

  await supabase.from("ai_sessions").update(updates).eq("id", record.id);

  return {
    ...record,
    lastUsedAt: now,
    usedAt: record.oneTime ? now : record.usedAt,
  };
}

export async function revokeSupabaseAiSession(sessionId: string): Promise<boolean> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", sessionId)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error) return false;
  return Boolean(data);
}

export async function listSupabaseAiSessions(): Promise<AiSessionPublic[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("ai_sessions")
    .select("*")
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as AiSessionRow[])
    .map(rowToRecord)
    .filter((r) => isActive(r))
    .map(toPublic);
}
