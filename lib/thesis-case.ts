/**
 * Case builder (read projection).
 * Deterministic, no mutation, no hindsight Stock File backfill.
 * T0 evidence is preserved; Reality/Outcome are always assembled when possessed.
 */

import { getPlanById, getPlans } from "./plans";
import type { TradePlan } from "./plan-types";
import { getTradeById, getTrades } from "./storage";
import type { Trade } from "./types";
import { getObservations } from "./observation-store";
import type { ObservationRecord } from "./observation-types";
import { getLearningOutcomeByPlanId } from "./learning-outcome-store";
import type { LearningOutcome } from "./learning-outcome-types";
import { getMafExperimentByPlanId } from "./maf-store";
import type { MafExperiment } from "./maf-types";
import type { ScoutDecision } from "./scout-decision-types";
import {
  expireOpenEpisodesDue,
  isEvidenceKnowableAtT0,
  listThesisT0Freezes,
} from "./thesis-t0";
import type { ThesisT0Confidence, ThesisT0Freeze } from "./thesis-t0-types";
import type {
  CaseT0Decision,
  CaseT0Evidence,
  CaseT0Plan,
  CaseT0PreEvent,
  CaseExecutionNoTrade,
  CaseExecutionTrade,
  CaseLearningEvidence,
  CaseMarketReality,
  CaseOutcomeSlice,
  CasePostDecision,
  CaseT0Source,
  CaseTemporalIntegrity,
  ThesisCase,
} from "./thesis-case-types";

export type BuildCaseDeps = {
  getPlanById?: (id: string) => Promise<TradePlan | undefined>;
  getPlans?: () => Promise<TradePlan[]>;
  listFreezes?: () => Promise<ThesisT0Freeze[]>;
  getTradeById?: (id: string) => Promise<Trade | undefined>;
  getTrades?: () => Promise<Trade[]>;
  getObservations?: () => Promise<ObservationRecord[]>;
  getLearningOutcomeByPlanId?: (
    planId: string
  ) => Promise<LearningOutcome | undefined>;
  getMafExperimentByPlanId?: (
    planId: string
  ) => Promise<MafExperiment | undefined>;
  /** Skip horizon expiry side-effect in pure unit tests when freezes are injected. */
  skipExpire?: boolean;
};

function depsOrDefault(deps?: BuildCaseDeps): Required<
  Omit<BuildCaseDeps, "skipExpire">
> & { skipExpire: boolean } {
  return {
    getPlanById: deps?.getPlanById ?? getPlanById,
    getPlans: deps?.getPlans ?? getPlans,
    listFreezes: deps?.listFreezes ?? listThesisT0Freezes,
    getTradeById: deps?.getTradeById ?? getTradeById,
    getTrades: deps?.getTrades ?? getTrades,
    getObservations: deps?.getObservations ?? getObservations,
    getLearningOutcomeByPlanId:
      deps?.getLearningOutcomeByPlanId ?? getLearningOutcomeByPlanId,
    getMafExperimentByPlanId:
      deps?.getMafExperimentByPlanId ?? getMafExperimentByPlanId,
    skipExpire: deps?.skipExpire ?? false,
  };
}

function resolveT0Source(freeze: ThesisT0Freeze | null): CaseT0Source {
  if (!freeze) return "none";
  if (freeze.decision?.decidedAt) return "scout_decision";
  if (freeze.plan.validFrom) return "plan_valid_from";
  return "plan_created_at";
}

/** Walk replacesPlanId / replacedByPlanId + freeze.planIds. */
export function reconstructPlanChain(
  anchor: TradePlan,
  allPlans: TradePlan[],
  freeze: ThesisT0Freeze | null
): string[] {
  const byId = new Map(allPlans.map((p) => [p.id.toUpperCase(), p]));
  const ordered: string[] = [];
  const seen = new Set<string>();

  // Walk backward via replacesPlanId to root.
  let cursor: TradePlan | undefined = anchor;
  const backward: string[] = [];
  while (cursor) {
    const key = cursor.id.toUpperCase();
    if (seen.has(key)) break;
    seen.add(key);
    backward.unshift(cursor.id);
    const prevId: string | undefined = cursor.replacesPlanId;
    cursor = prevId ? byId.get(prevId.toUpperCase()) : undefined;
  }

  // Walk forward via replacedByPlanId.
  cursor = byId.get(anchor.id.toUpperCase());
  seen.clear();
  for (const id of backward) seen.add(id.toUpperCase());
  ordered.push(...backward);
  while (cursor?.replacedByPlanId) {
    const next = byId.get(cursor.replacedByPlanId.toUpperCase());
    if (!next || seen.has(next.id.toUpperCase())) break;
    seen.add(next.id.toUpperCase());
    ordered.push(next.id);
    cursor = next;
  }

  if (freeze) {
    for (const id of freeze.planIds) {
      if (!seen.has(id.toUpperCase())) {
        seen.add(id.toUpperCase());
        ordered.push(id);
      }
    }
  }
  return ordered;
}

export function findFreezeForPlan(
  plan: TradePlan,
  freezes: ThesisT0Freeze[]
): ThesisT0Freeze | null {
  const planKey = plan.id.toUpperCase();
  // Plan-specific binding only. Never inherit another Plan's freeze via shared
  // stockThesisId (MXT 028 — PLAN-001 must not attach PLAN-009 T0).
  const byPlanIds = freezes.find((f) =>
    f.planIds.some((id) => id.toUpperCase() === planKey)
  );
  if (byPlanIds) return byPlanIds;

  const byPlanGeometry = freezes.find(
    (f) => f.plan.planId.toUpperCase() === planKey
  );
  return byPlanGeometry ?? null;
}

function buildT0PreEvent(freeze: ThesisT0Freeze): CaseT0PreEvent | null {
  const s = freeze.stock;
  if (
    s.thesis == null &&
    s.currentHypothesis == null &&
    s.levels == null &&
    s.riskRules == null
  ) {
    return null;
  }
  return {
    thesis: s.thesis,
    currentHypothesis: s.currentHypothesis,
    levels: s.levels,
    riskRules: s.riskRules,
    stockThesisVersion: s.stockThesisVersion,
  };
}

function buildT0Plan(freeze: ThesisT0Freeze): CaseT0Plan {
  const p = freeze.plan;
  return {
    planId: p.planId,
    plannedEntry: p.plannedEntry,
    originalEntry: p.originalEntry ?? p.plannedEntry ?? null,
    participationBlocker: p.participationBlocker ?? null,
    reviseIf: p.reviseIf ?? null,
    maximumEntryProxy: p.maximumEntryProxy,
    stopPrice: p.stopPrice,
    targetPrice: p.targetPrice,
    plannedRR: p.plannedRR,
    layeredEntry: p.layeredEntry,
    executionInstruction: p.executionInstruction,
  };
}

function buildT0Decision(freeze: ThesisT0Freeze): CaseT0Decision | null {
  if (!freeze.decision) return null;
  const d = freeze.decision;
  return {
    decisionId: d.decisionId,
    decidedAt: d.decidedAt,
    verdict: d.verdict,
    reasoning: d.reasoning,
    challenges: [...d.challenges],
    decidedBy: d.decidedBy ?? null,
    decisionConfidence: d.decisionConfidence ?? null,
    opportunityQuality: d.opportunityQuality ?? null,
    thesisQuality: d.thesisQuality ?? null,
    planningRisk: d.planningRisk ?? null,
    executionRisk: d.executionRisk ?? null,
    locationEvidence: d.locationEvidence ?? null,
    confirmationEvidence: d.confirmationEvidence ?? null,
    confirmationCost: d.confirmationCost ?? null,
  };
}

/**
 * T0 / original evidence from effective freeze only.
 * unavailable → no fabricated packet; never read live Stock File.
 */
export function buildT0EvidencePacket(
  freeze: ThesisT0Freeze | null
): CaseT0Evidence {
  if (!freeze) {
    return {
      available: false,
      integrity: "unavailable",
      reason:
        "No T0 freeze for this plan — decision-time snapshot not preserved.",
      preEvent: null,
      plan: null,
      decision: null,
    };
  }

  if (freeze.confidence === "unavailable") {
    return {
      available: false,
      integrity: "unavailable",
      reason:
        "Historical T0 reconstruction unavailable — not fabricated from current Stock File.",
      preEvent: null,
      plan: null,
      decision: null,
    };
  }

  const preEvent = buildT0PreEvent(freeze);
  const decision = buildT0Decision(freeze);
  const plan = buildT0Plan(freeze);

  if (freeze.confidence === "partial") {
    return {
      available: true,
      integrity: "partial",
      reason:
        "PARTIAL historical reconstruction — only fields preserved at T0 are shown.",
      preEvent,
      plan,
      decision,
    };
  }

  return {
    available: true,
    integrity: "verified",
    preEvent,
    plan,
    decision,
  };
}

function buildTemporalIntegrity(
  freeze: ThesisT0Freeze | null
): CaseTemporalIntegrity {
  const confidence: ThesisT0Confidence = freeze?.confidence ?? "unavailable";
  const t0VerifiedForReconstruction =
    confidence === "verified" &&
    freeze != null &&
    freeze.decision != null &&
    freeze.stock.thesis != null &&
    freeze.stock.riskRules != null;

  return {
    t0Source: resolveT0Source(freeze),
    t0: freeze?.t0 ?? null,
    freezeId: freeze?.id ?? null,
    freezeAvailable: freeze != null,
    confidence,
    t0VerifiedForReconstruction,
  };
}

function findLinkedTrade(
  plan: TradePlan,
  relatedPlanIds: string[],
  trades: Trade[],
  getById: (id: string) => Promise<Trade | undefined>
): Promise<Trade | undefined> {
  return (async () => {
    if (plan.linkedTradeId) {
      const t = await getById(plan.linkedTradeId);
      if (t) return t;
    }
    const planKeys = new Set(relatedPlanIds.map((id) => id.toUpperCase()));
    planKeys.add(plan.id.toUpperCase());
    return trades.find(
      (t) => t.planId && planKeys.has(t.planId.toUpperCase())
    );
  })();
}

function buildExecution(
  plan: TradePlan,
  trade: Trade | undefined,
  freeze: ThesisT0Freeze | null
): CaseExecutionTrade | CaseExecutionNoTrade {
  if (trade) {
    return {
      kind: "trade",
      tradeId: trade.id,
      status: trade.status,
      entry: trade.entry ?? null,
      exit: trade.exit ?? null,
      stop: trade.stop ?? null,
      target: trade.target ?? null,
      closedAt: trade.closedAt ?? null,
      exitReason: trade.exitReason ?? null,
      riskRewardActual: trade.riskRewardActual ?? null,
      realizedPnLHint: null, // do not invent; Trade has no canonical realizedPnL field
    };
  }
  const verdict =
    plan.decision?.verdict ?? freeze?.decision?.verdict ?? null;
  return {
    kind: "no_trade",
    disposition:
      verdict === "wait"
        ? "WAIT — no trade"
        : verdict === "no"
          ? "PASS — no trade"
          : plan.outcome?.tradeExecuted === false
            ? "NO TRADE (plan outcome)"
            : "NO TRADE",
    scoutVerdict: verdict,
    planStatus: plan.status,
  };
}

function buildMarketReality(
  freeze: ThesisT0Freeze | null,
  observations: ObservationRecord[],
  relatedPlanIds: string[],
  tradeId: string | undefined
): CaseMarketReality {
  const t0 = freeze?.t0;
  const planKeys = new Set(relatedPlanIds.map((id) => id.toUpperCase()));
  const relevant = observations.filter((o) => {
    if (o.planId && planKeys.has(o.planId.toUpperCase())) return true;
    if (tradeId && o.tradeId?.toUpperCase() === tradeId.toUpperCase())
      return true;
    return false;
  });

  const mapped = relevant.map((o) => ({
    id: o.id,
    startedAt: o.startedAt,
    endsAt: o.endsAt,
    status: o.status,
    maxPrice: o.maxPrice ?? null,
    minPrice: o.minPrice ?? null,
    targetReached: o.targetReached ?? null,
    thesisInvalidated: o.thesisInvalidated ?? null,
    firstTerminalEvent: o.firstTerminalEvent ?? null,
    observedAfterT0: t0
      ? !isEvidenceKnowableAtT0(o.startedAt, t0)
      : true,
  }));

  const horizonExpired =
    freeze != null &&
    (freeze.status === "expired_inconclusive" ||
      (freeze.t1 != null && freeze.status !== "open"));

  let completeness: CaseMarketReality["completeness"] = "unavailable";
  if (mapped.length > 0) {
    const hasPrice =
      mapped.some((m) => m.maxPrice != null || m.minPrice != null) ||
      mapped.some(
        (m) => m.targetReached != null || m.thesisInvalidated != null
      );
    completeness = hasPrice ? "available" : "incomplete";
  } else if (horizonExpired) {
    completeness = "incomplete";
  }

  return {
    completeness,
    observations: mapped,
    horizonExpired:
      freeze?.status === "expired_inconclusive" ||
      (freeze != null &&
        freeze.status !== "open" &&
        freeze.t1 != null &&
        Date.parse(freeze.evaluationHorizonEndsAt) <=
          Date.parse(freeze.t1)),
  };
}

function laterDecisions(plan: TradePlan, t0: string | null): ScoutDecision[] {
  if (!t0) return [];
  const hist = [
    ...(plan.decisionHistory ?? []),
    ...(plan.decision ? [plan.decision] : []),
  ];
  const seen = new Set<string>();
  const out: ScoutDecision[] = [];
  for (const d of hist) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    if (!isEvidenceKnowableAtT0(d.decidedAt, t0)) {
      out.push(d);
    }
  }
  return out.sort((a, b) => a.decidedAt.localeCompare(b.decidedAt));
}

function observationsForCase(
  all: ObservationRecord[],
  relatedPlanIds: string[],
  tradeId: string | undefined
): ObservationRecord[] {
  const planKeys = new Set(relatedPlanIds.map((id) => id.toUpperCase()));
  return all.filter((o) => {
    return (
      (o.planId && planKeys.has(o.planId.toUpperCase())) ||
      (tradeId && o.tradeId?.toUpperCase() === tradeId.toUpperCase())
    );
  });
}

export async function buildPostDecisionPacket(
  plan: TradePlan,
  freeze: ThesisT0Freeze | null,
  relatedPlanIds: string[],
  deps?: BuildCaseDeps
): Promise<CasePostDecision> {
  const d = depsOrDefault(deps);
  const [trades, observations, learning, maf] = await Promise.all([
    d.getTrades(),
    d.getObservations(),
    d.getLearningOutcomeByPlanId(plan.id),
    d.getMafExperimentByPlanId(plan.id),
  ]);

  const trade = await findLinkedTrade(
    plan,
    relatedPlanIds,
    trades,
    d.getTradeById
  );

  const execution = buildExecution(plan, trade, freeze);
  const marketReality = buildMarketReality(
    freeze,
    observations,
    relatedPlanIds,
    trade?.id
  );

  const outcome: CaseOutcomeSlice = {
    planOutcome: plan.outcome ?? null,
    tradeReviewedAt: trade?.reviewedAt ?? null,
    tradeLesson: trade?.lesson ?? null,
  };

  const learningEvidence: CaseLearningEvidence = {
    learningOutcome: learning ?? null,
    observations: observationsForCase(observations, relatedPlanIds, trade?.id),
    mafExperiment: maf ?? null,
    laterDecisions: laterDecisions(plan, freeze?.t0 ?? null),
  };

  return { execution, marketReality, outcome, learningEvidence };
}

export async function buildCase(
  planId: string,
  deps?: BuildCaseDeps
): Promise<ThesisCase | null> {
  const d = depsOrDefault(deps);
  const plan = await d.getPlanById(planId);
  if (!plan) return null;

  if (!d.skipExpire) {
    try {
      await expireOpenEpisodesDue({});
    } catch {
      // Best-effort horizon sync — Case remains read-only for caller.
    }
  }

  const [allPlans, freezes] = await Promise.all([
    d.getPlans(),
    d.listFreezes(),
  ]);
  const freeze = findFreezeForPlan(plan, freezes);
  const relatedPlanIds = reconstructPlanChain(plan, allPlans, freeze);
  const temporalIntegrity = buildTemporalIntegrity(freeze);
  const t0Evidence = buildT0EvidencePacket(freeze);
  const postDecision = await buildPostDecisionPacket(
    plan,
    freeze,
    relatedPlanIds,
    deps
  );

  return {
    identity: {
      anchorPlanId: plan.id,
      stockThesisId: plan.stockThesisId ?? freeze?.stockThesisId ?? null,
      ticker: plan.ticker,
      relatedPlanIds,
      t0: freeze?.t0 ?? null,
      t1: freeze?.t1 ?? null,
      evaluationHorizonDays: freeze?.evaluationHorizonDays ?? null,
      evaluationHorizonEndsAt: freeze?.evaluationHorizonEndsAt ?? null,
      episodeStatus: freeze?.status ?? "no_freeze",
      confidence: temporalIntegrity.confidence,
    },
    temporalIntegrity,
    freeze,
    t0Evidence,
    postDecision,
  };
}

export async function buildT0EvidenceForPlan(
  planId: string,
  deps?: BuildCaseDeps
): Promise<CaseT0Evidence | null> {
  const c = await buildCase(planId, deps);
  return c?.t0Evidence ?? null;
}

export async function buildPostDecisionForPlan(
  planId: string,
  deps?: BuildCaseDeps
): Promise<CasePostDecision | null> {
  const c = await buildCase(planId, deps);
  return c?.postDecision ?? null;
}

/** Forbidden keys that must not appear in T0 evidence serialization. */
export const T0_HINDSIGHT_FORBIDDEN_KEYS = [
  "realizedPnL",
  "realizedResultR",
  "realizedR",
  "riskRewardActual",
  "learningOutcome",
  "mafExperiment",
  "closedAt",
  "exitReason",
  "reviewedAt",
  "lesson",
  "theoreticalResultR",
  "counterfactualR",
  "counterfactualDollarResult",
  "maxPrice",
  "minPrice",
  "mfe",
  "mae",
  "targetReached",
  "thesisInvalidated",
] as const;

/** Serialize T0 evidence for leak inspection. */
export function serializeT0EvidenceForLeakTest(
  t0Evidence: CaseT0Evidence
): string {
  return JSON.stringify(t0Evidence);
}

export function findT0HindsightLeaks(t0Evidence: CaseT0Evidence): string[] {
  const raw = serializeT0EvidenceForLeakTest(t0Evidence);
  const leaks: string[] = [];
  for (const key of T0_HINDSIGHT_FORBIDDEN_KEYS) {
    if (new RegExp(`"${key}"\\s*:`).test(raw)) {
      leaks.push(key);
    }
  }
  if (/\b(pnl|p&l|realized\s*r)\b/i.test(raw)) {
    leaks.push("pnl_language");
  }
  return leaks;
}
