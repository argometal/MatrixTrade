import { createHash, randomBytes } from "crypto";
import type { ScoutDecision } from "./scout-decision-types";
import type { TradePlan } from "./plan-types";
import type { StockThesis } from "./stock-thesis-types";
import { getHighestLimitPrice } from "./layered-entry";
import {
  DEFAULT_THESIS_HORIZON_DAYS,
  type ThesisEpisodeStatus,
  type ThesisT0Confidence,
  type ThesisT0DecisionSlice,
  type ThesisT0Freeze,
  type ThesisT0PlanGeometry,
  type ThesisT0StockContext,
} from "./thesis-t0-types";
import { getThesisT0Store } from "./thesis-t0-store";
import { isMxtReadOnlyMode } from "./mxt-readonly";

/** Episode key when Plan has no Stock Thesis — reuses freeze store, no new table. */
export const PLAN_ONLY_THESIS_PREFIX = "PLAN-ONLY:";

export function planOnlyThesisAnchor(planId: string): string {
  return `${PLAN_ONLY_THESIS_PREFIX}${planId.trim().toUpperCase()}`;
}

export function isPlanOnlyThesisAnchor(id: string): boolean {
  return id.toUpperCase().startsWith(PLAN_ONLY_THESIS_PREFIX);
}

/** Resolve freeze episode key: linked Stock Thesis, else plan-anchored id. */
export function resolveThesisEpisodeKey(plan: TradePlan): string {
  const linked = plan.stockThesisId?.trim();
  if (linked) return linked.toUpperCase();
  return planOnlyThesisAnchor(plan.id);
}

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
    originalEntry: plan.originalEntry ?? plan.plannedEntry ?? null,
    participationBlocker: plan.participationBlocker?.trim()
      ? plan.participationBlocker.trim()
      : null,
    reviseIf: plan.reviseIf?.length ? [...plan.reviseIf] : null,
    stopPrice: plan.stopPrice ?? null,
    targetPrice: plan.targetPrice ?? null,
    plannedRR: plan.plannedRR ?? null,
    layeredEntry: plan.layeredEntry ? structuredClone(plan.layeredEntry) : null,
    executionInstruction: plan.executionInstruction ?? null,
    validFrom: plan.validFrom ?? null,
    maximumEntryProxy: maxProxy ?? null,
    playbookId: plan.playbookId?.trim() ? plan.playbookId.trim() : null,
  };
}

export function decisionSlice(decision: ScoutDecision): ThesisT0DecisionSlice {
  return {
    decisionId: decision.id,
    decidedAt: decision.decidedAt,
    verdict: decision.verdict,
    reasoning: decision.reasoning ?? null,
    challenges: [...decision.challenges],
    decidedBy: decision.decidedBy ?? null,
    decisionConfidence:
      decision.decisionConfidence != null &&
      Number.isFinite(decision.decisionConfidence)
        ? decision.decisionConfidence
        : null,
    opportunityQuality:
      decision.opportunityQuality != null &&
      Number.isFinite(decision.opportunityQuality)
        ? decision.opportunityQuality
        : null,
    thesisQuality:
      decision.thesisQuality != null && Number.isFinite(decision.thesisQuality)
        ? decision.thesisQuality
        : null,
    planningRisk: decision.planningRisk
      ? structuredClone(decision.planningRisk)
      : null,
    executionRisk: decision.executionRisk
      ? structuredClone(decision.executionRisk)
      : null,
    locationEvidence: decision.locationEvidence?.trim()
      ? decision.locationEvidence.trim()
      : null,
    confirmationEvidence: decision.confirmationEvidence?.trim()
      ? decision.confirmationEvidence.trim()
      : null,
    confirmationCost: decision.confirmationCost
      ? structuredClone(decision.confirmationCost)
      : null,
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
  const episodeKey = resolveThesisEpisodeKey(input.plan);
  const { t0, confidence: timeConfidence } = resolveT0Timestamp(
    input.plan,
    input.decision
  );
  const stock = stockContextFromThesis(input.thesis, episodeKey);
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
 * Result of ensuring a T0 freeze after Scout decision.
 * Decision commit may succeed while freeze fails — callers must observe this.
 */
export type ThesisT0EnsureStatus =
  | "created"
  | "linked_existing"
  | "already_open"
  | "skipped_readonly"
  | "failed"
  | "no_decision";

export type ThesisT0EnsureResult = {
  freeze: ThesisT0Freeze | null;
  created: boolean;
  status: ThesisT0EnsureStatus;
  error?: string;
};

/**
 * First committed Scout decision creates an immutable T0 freeze.
 * Plans without stockThesisId use PLAN-ONLY:{planId} episode key (same store).
 * Later decisions / Stock File edits must not rewrite an existing open freeze body.
 */
export async function ensureThesisT0OnScoutDecision(input: {
  plan: TradePlan;
  thesis?: StockThesis | null;
  evaluationHorizonDays?: number;
}): Promise<ThesisT0EnsureResult> {
  const decision = input.plan.decision;
  if (!decision) {
    return { freeze: null, created: false, status: "no_decision" };
  }

  if (isMxtReadOnlyMode()) {
    return {
      freeze: null,
      created: false,
      status: "skipped_readonly",
      error:
        "[MXT_READ_ONLY] T0 freeze not written — decision persisted without freeze.",
    };
  }

  try {
    const episodeKey = resolveThesisEpisodeKey(input.plan);
    const store = getThesisT0Store();
    await expireOpenEpisodesDue({ nowIso: new Date().toISOString() });

    const open = await store.findOpenByStockThesisId(episodeKey);
    if (open) {
      if (
        input.plan.id &&
        !open.planIds.some(
          (id) => id.toUpperCase() === input.plan.id.toUpperCase()
        )
      ) {
        const linked: ThesisT0Freeze = {
          ...open,
          planIds: [...open.planIds, input.plan.id],
          updatedAt: new Date().toISOString(),
        };
        await store.upsert(linked);
        return { freeze: linked, created: false, status: "linked_existing" };
      }
      return { freeze: open, created: false, status: "already_open" };
    }

    let thesis = input.thesis;
    const linkedThesisId = input.plan.stockThesisId?.trim();
    if (thesis === undefined && linkedThesisId) {
      const { getStockThesisById } = await import("./stock-theses");
      thesis = await getStockThesisById(linkedThesisId);
    }
    if (!linkedThesisId) {
      thesis = null;
    }

    const freeze = buildThesisT0Freeze({
      plan: input.plan,
      decision,
      thesis: thesis ?? null,
      evaluationHorizonDays: input.evaluationHorizonDays,
    });
    await store.insert(freeze);
    return { freeze, created: true, status: "created" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      "[thesis-t0] ensureThesisT0OnScoutDecision failed for plan " +
        input.plan.id +
        ": " +
        message
    );
    return {
      freeze: null,
      created: false,
      status: "failed",
      error: message,
    };
  }
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
