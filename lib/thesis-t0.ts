import { createHash, randomBytes } from "crypto";
import type { ScoutDecision } from "./scout-decision-types";
import type { TradePlan } from "./plan-types";
import type { StockThesis } from "./stock-thesis-types";
import { getHighestLimitPrice } from "./layered-entry";
import {
  DEFAULT_THESIS_HORIZON_DAYS,
  type ThesisEpisodeStatus,
  type ThesisT0Confidence,
  type ThesisT0Freeze,
  type ThesisT0PlanGeometry,
  type ThesisT0StockContext,
} from "./thesis-t0-types";
import { getThesisT0Store } from "./thesis-t0-store";

export function newThesisT0FreezeId(): string {
  return `T0-${randomBytes(6).toString("hex")}`;
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export function computeBeliefFingerprint(input: {
  thesis?: string | null;
  currentHypothesis?: string | null;
  levels?: unknown;
  riskRules?: unknown;
}): string {
  const payload = JSON.stringify({
    thesis: (input.thesis ?? "").trim(),
    currentHypothesis: (input.currentHypothesis ?? "").trim(),
    levels: input.levels ?? null,
    riskRules: input.riskRules ?? null,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

function stockContextFromThesis(
  thesis: StockThesis | null | undefined,
  stockThesisId: string
): ThesisT0StockContext {
  if (!thesis) {
    return {
      stockThesisId,
      stockThesisVersion: null,
      thesis: null,
      currentHypothesis: null,
      levels: null,
      riskRules: null,
    };
  }
  return {
    stockThesisId: thesis.id,
    stockThesisVersion: thesis.version,
    thesis: thesis.thesis,
    currentHypothesis: thesis.currentHypothesis,
    levels: structuredClone(thesis.levels),
    riskRules: structuredClone(thesis.riskRules),
  };
}

function planGeometryFromPlan(plan: TradePlan): ThesisT0PlanGeometry {
  const maxProxy =
    plan.layeredEntry != null ? getHighestLimitPrice(plan.layeredEntry) : null;
  return {
    planId: plan.id,
    plannedEntry: plan.plannedEntry ?? null,
    stopPrice: plan.stopPrice ?? null,
    targetPrice: plan.targetPrice ?? null,
    plannedRR: plan.plannedRR ?? null,
    layeredEntry: plan.layeredEntry ? structuredClone(plan.layeredEntry) : null,
    executionInstruction: plan.executionInstruction ?? null,
    validFrom: plan.validFrom ?? null,
    maximumEntryProxy: maxProxy ?? null,
  };
}

function decisionSlice(decision: ScoutDecision) {
  return {
    decisionId: decision.id,
    decidedAt: decision.decidedAt,
    verdict: decision.verdict,
    reasoning: decision.reasoning ?? null,
    challenges: [...decision.challenges],
    decidedBy: decision.decidedBy ?? null,
  };
}

export function resolveT0Timestamp(plan: TradePlan, decision: ScoutDecision | null): {
  t0: string;
  confidence: ThesisT0Confidence;
} {
  if (decision?.decidedAt) {
    return { t0: decision.decidedAt, confidence: "verified" };
  }
  if (plan.validFrom) {
    return { t0: plan.validFrom, confidence: "partial" };
  }
  if (plan.createdAt) {
    return { t0: plan.createdAt, confidence: "partial" };
  }
  return { t0: new Date().toISOString(), confidence: "unavailable" };
}

export function buildThesisT0Freeze(input: {
  plan: TradePlan;
  decision: ScoutDecision | null;
  thesis: StockThesis | null | undefined;
  evaluationHorizonDays?: number;
  nowIso?: string;
}): ThesisT0Freeze {
  const stockThesisId = (input.plan.stockThesisId ?? "").toUpperCase();
  const { t0, confidence: timeConfidence } = resolveT0Timestamp(
    input.plan,
    input.decision
  );
  const stock = stockContextFromThesis(input.thesis, stockThesisId || "UNKNOWN");
  const hasStockSnapshot =
    stock.thesis != null &&
    stock.currentHypothesis != null &&
    stock.riskRules != null;
  let confidence: ThesisT0Confidence = timeConfidence;
  if (timeConfidence === "verified" && !hasStockSnapshot) {
    confidence = "partial";
  }
  if (!input.decision && !input.plan.validFrom && !input.plan.createdAt) {
    confidence = "unavailable";
  }

  const horizonDays =
    input.evaluationHorizonDays != null &&
    Number.isFinite(input.evaluationHorizonDays) &&
    input.evaluationHorizonDays > 0
      ? Math.floor(input.evaluationHorizonDays)
      : DEFAULT_THESIS_HORIZON_DAYS;
  const override =
    input.evaluationHorizonDays != null &&
    Number.isFinite(input.evaluationHorizonDays) &&
    input.evaluationHorizonDays > 0;
  const now = input.nowIso ?? new Date().toISOString();

  return {
    id: newThesisT0FreezeId(),
    stockThesisId: stock.stockThesisId,
    t0,
    evaluationHorizonEndsAt: addDaysIso(t0, horizonDays),
    evaluationHorizonDays: horizonDays,
    evaluationHorizonOverride: override,
    beliefFingerprint: hasStockSnapshot
      ? computeBeliefFingerprint({
          thesis: stock.thesis,
          currentHypothesis: stock.currentHypothesis,
          levels: stock.levels,
          riskRules: stock.riskRules,
        })
      : null,
    planIds: [input.plan.id],
    stock,
    decision: input.decision ? decisionSlice(input.decision) : null,
    plan: planGeometryFromPlan(input.plan),
    confidence,
    status: "open",
    t1: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * First committed Scout decision for a thesis creates an immutable T0 freeze.
 * Later decisions / Stock File edits must not rewrite an existing open freeze body.
 * PLAN-002: append planId only; freeze stock/decision/geometry stay historical.
 */
export async function ensureThesisT0OnScoutDecision(input: {
  plan: TradePlan;
  thesis?: StockThesis | null;
  evaluationHorizonDays?: number;
}): Promise<{ freeze: ThesisT0Freeze | null; created: boolean }> {
  const stockThesisId = input.plan.stockThesisId?.trim();
  if (!stockThesisId) {
    return { freeze: null, created: false };
  }
  const decision = input.plan.decision;
  if (!decision) {
    return { freeze: null, created: false };
  }

  const store = getThesisT0Store();
  await expireOpenEpisodesDue({ nowIso: new Date().toISOString() });

  const open = await store.findOpenByStockThesisId(stockThesisId);
  if (open) {
    // Immutability: never rewrite freeze payload. Optionally link new plan id.
    if (
      input.plan.id &&
      !open.planIds.some((id) => id.toUpperCase() === input.plan.id.toUpperCase())
    ) {
      const linked: ThesisT0Freeze = {
        ...open,
        planIds: [...open.planIds, input.plan.id],
        updatedAt: new Date().toISOString(),
      };
      await store.upsert(linked);
      return { freeze: linked, created: false };
    }
    return { freeze: open, created: false };
  }

  let thesis = input.thesis;
  if (thesis === undefined) {
    const { getStockThesisById } = await import("./stock-theses");
    thesis = await getStockThesisById(stockThesisId);
  }

  const freeze = buildThesisT0Freeze({
    plan: input.plan,
    decision,
    thesis: thesis ?? null,
    evaluationHorizonDays: input.evaluationHorizonDays,
  });
  await store.insert(freeze);
  return { freeze, created: true };
}

export async function getOpenThesisT0Freeze(
  stockThesisId: string
): Promise<ThesisT0Freeze | null> {
  await expireOpenEpisodesDue({});
  return getThesisT0Store().findOpenByStockThesisId(stockThesisId);
}

export async function getThesisT0FreezeById(
  id: string
): Promise<ThesisT0Freeze | null> {
  return getThesisT0Store().getById(id);
}

export async function listThesisT0Freezes(): Promise<ThesisT0Freeze[]> {
  return getThesisT0Store().readAll();
}

/** Close episode at T1 with an explicit semantic status. */
export async function closeThesisEpisode(
  freezeId: string,
  status: Exclude<ThesisEpisodeStatus, "open">,
  t1Iso?: string
): Promise<ThesisT0Freeze | null> {
  const store = getThesisT0Store();
  const row = await store.getById(freezeId);
  if (!row || row.status !== "open") return row;
  const t1 = t1Iso ?? new Date().toISOString();
  const updated: ThesisT0Freeze = {
    ...row,
    status,
    t1,
    updatedAt: t1,
  };
  await store.upsert(updated);
  return updated;
}

/** Horizon expiry → evaluable expired/inconclusive (no-trade is first-class). */
export async function expireOpenEpisodesDue(input: {
  nowIso?: string;
}): Promise<ThesisT0Freeze[]> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const now = Date.parse(nowIso);
  if (!Number.isFinite(now)) return [];
  const store = getThesisT0Store();
  const all = await store.readAll();
  const expired: ThesisT0Freeze[] = [];
  for (const row of all) {
    if (row.status !== "open") continue;
    const end = Date.parse(row.evaluationHorizonEndsAt);
    if (!Number.isFinite(end) || end > now) continue;
    const updated: ThesisT0Freeze = {
      ...row,
      status: "expired_inconclusive",
      t1: row.evaluationHorizonEndsAt,
      updatedAt: nowIso,
    };
    await store.upsert(updated);
    expired.push(updated);
  }
  return expired;
}

/**
 * Legacy reconstruction confidence without hindsight Stock File mutation.
 * Never invent stock snapshot from a later Stock File state.
 */
export function classifyLegacyT0Confidence(input: {
  hasCommittedDecision: boolean;
  hasContemporaneousStockSnapshot: boolean;
  hasPlanCreatedOrValidFrom: boolean;
}): ThesisT0Confidence {
  if (input.hasCommittedDecision && input.hasContemporaneousStockSnapshot) {
    return "verified";
  }
  if (input.hasCommittedDecision || input.hasPlanCreatedOrValidFrom) {
    return "partial";
  }
  return "unavailable";
}

/**
 * Evidence temporal gate: observedAt after T0 must not be treated as T0-knowable.
 */
export function isEvidenceKnowableAtT0(
  observedAt: string | null | undefined,
  t0: string
): boolean {
  if (!observedAt) return false;
  const o = Date.parse(observedAt);
  const t = Date.parse(t0);
  if (!Number.isFinite(o) || !Number.isFinite(t)) return false;
  return o <= t;
}
