import type { ThesisT0Freeze } from "../thesis-t0-types";

/** Supabase row shape for public.thesis_t0_freezes */
export type ThesisT0FreezeRow = {
  id: string;
  stock_thesis_id: string;
  t0: string;
  evaluation_horizon_ends_at: string;
  evaluation_horizon_days: number;
  evaluation_horizon_override: boolean;
  belief_fingerprint: string | null;
  plan_ids: unknown;
  stock: unknown;
  decision: unknown;
  plan: unknown;
  confidence: string;
  status: string;
  t1: string | null;
  created_at: string;
  updated_at: string;
};

export function freezeToRow(f: ThesisT0Freeze): ThesisT0FreezeRow {
  return {
    id: f.id,
    stock_thesis_id: f.stockThesisId,
    t0: f.t0,
    evaluation_horizon_ends_at: f.evaluationHorizonEndsAt,
    evaluation_horizon_days: f.evaluationHorizonDays,
    evaluation_horizon_override: f.evaluationHorizonOverride,
    belief_fingerprint: f.beliefFingerprint,
    plan_ids: f.planIds,
    stock: f.stock,
    decision: f.decision,
    plan: f.plan,
    confidence: f.confidence,
    status: f.status,
    t1: f.t1,
    created_at: f.createdAt,
    updated_at: f.updatedAt,
  };
}

export function rowToFreeze(row: ThesisT0FreezeRow): ThesisT0Freeze {
  return {
    id: row.id,
    stockThesisId: row.stock_thesis_id,
    t0: row.t0,
    evaluationHorizonEndsAt: row.evaluation_horizon_ends_at,
    evaluationHorizonDays: row.evaluation_horizon_days,
    evaluationHorizonOverride: row.evaluation_horizon_override,
    beliefFingerprint: row.belief_fingerprint,
    planIds: Array.isArray(row.plan_ids)
      ? (row.plan_ids as string[])
      : [],
    stock: row.stock as ThesisT0Freeze["stock"],
    decision: (row.decision as ThesisT0Freeze["decision"]) ?? null,
    plan: row.plan as ThesisT0Freeze["plan"],
    confidence: row.confidence as ThesisT0Freeze["confidence"],
    status: row.status as ThesisT0Freeze["status"],
    t1: row.t1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
