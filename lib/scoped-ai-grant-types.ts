export type ScopedAiGrantScope = "read" | "propose";

export interface ScopedAiGrant {
  id: string;
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
] as const;

export type ScopedAiAllowedProposalType = (typeof SCOPED_AI_ALLOWED_PROPOSAL_TYPES)[number];
