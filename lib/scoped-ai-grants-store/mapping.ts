import type { ScopedAiGrant, ScopedAiGrantKind, ScopedAiGrantScope } from "../scoped-ai-grant-types";

export interface ScopedAiGrantRow {
  id: string;
  kind: ScopedAiGrantKind;
  stock_profile_id: string;
  ticker: string;
  plan_id: string | null;
  scopes: string[];
  expires_at: string;
  created_at: string;
  label: string | null;
}

function parseScopes(raw: string[]): ScopedAiGrantScope[] {
  return raw.filter((s): s is ScopedAiGrantScope => s === "read" || s === "propose");
}

export function grantRowToGrant(row: ScopedAiGrantRow): ScopedAiGrant {
  return {
    id: row.id,
    kind: row.kind,
    stockProfileId: row.stock_profile_id,
    ticker: row.ticker,
    planId: row.plan_id ?? undefined,
    scopes: parseScopes(row.scopes).length ? parseScopes(row.scopes) : ["read", "propose"],
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    label: row.label ?? undefined,
  };
}

export function grantToRow(grant: ScopedAiGrant): ScopedAiGrantRow {
  return {
    id: grant.id,
    kind: grant.kind ?? "profile",
    stock_profile_id: grant.stockProfileId,
    ticker: grant.ticker,
    plan_id: grant.planId ?? null,
    scopes: grant.scopes,
    expires_at: grant.expiresAt,
    created_at: grant.createdAt,
    label: grant.label ?? null,
  };
}
