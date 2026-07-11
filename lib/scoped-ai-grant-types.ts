export type ScopedAiGrantKind = "profile" | "bootstrap";

export type ScopedAiGrantScope = "read" | "propose";

export interface ScopedAiGrant {
  id: string;
  /** profile = one stock; bootstrap = new stock-case-create only */
  kind?: ScopedAiGrantKind;
  stockProfileId: string;
  ticker: string;
  /** Optional scout episode binding — one PLAN per grant. */
  planId?: string;
  scopes: ScopedAiGrantScope[];
  expiresAt: string;
  createdAt: string;
  label?: string;
}

export const SCOPED_AI_DEFAULT_TTL_HOURS = 24;

export const SCOPED_AI_ALLOWED_PROPOSAL_TYPES = [
  "evidence-add",
  "file-update",
  "scout-assessment",
  "decision-update",
  "layered-entry-update",
] as const;

export type ScopedAiAllowedProposalType = (typeof SCOPED_AI_ALLOWED_PROPOSAL_TYPES)[number];

export const BOOTSTRAP_AI_ALLOWED_PROPOSAL_TYPES = ["stock-case-create"] as const;

export function grantKind(grant: ScopedAiGrant): ScopedAiGrantKind {
  return grant.kind ?? "profile";
}

export function isBootstrapGrant(grant: ScopedAiGrant): boolean {
  return grantKind(grant) === "bootstrap";
}
