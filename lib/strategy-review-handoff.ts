/**
 * MTA STRATEGY REVIEW HANDOFF — read-only projection for external AI review.
 * PROMPT: MTA-AI-STRATEGY-HANDOFF-001
 *
 * Never invents market data. Never mutates. Never mixes Scout counterfactual with Trade P/L.
 */
import type { LearningOutcome } from "./learning-outcome-types";
import type { MafExperiment } from "./maf-types";
import type { ObservationRecord } from "./observation-types";
import {
  planNeedsLearningSyncRepair,
  planNeedsStrategyReview,
} from "./plan-helpers";
import type { TradePlan } from "./plan-types";
import type { SnapshotMenuItem } from "./snapshot-types";
import { wrapSnapshotText } from "./snapshot-verification";
import type { StockThesis } from "./stock-thesis-types";
import type { Trade } from "./types";

export const STRATEGY_REVIEW_HANDOFF_VERSION = "1.0.0";
export const STRATEGY_REVIEW_SNAPSHOT_ID = "strategy-review";
export const STRATEGY_REVIEW_SNAPSHOT_LABEL = "Snap Strategy Review";

export type HandoffPresence = "recorded" | "not_recorded" | "unknown" | "null";

export type StrategyReviewHandoffInput = {
  plan: TradePlan;
  stockThesis?: StockThesis | null;
  linkedTrade?: Trade | null;
  learningOutcomes?: LearningOutcome[];
  observations?: ObservationRecord[];
  mafExperiments?: MafExperiment[];
  /** ISO clock for generatedAt / reviewAsOf — defaults to now. */
  now?: string;
};

export type StrategyReviewLinkedTradeSummary = {
  tradeId: string;
  status: string;
  entry: number;
  stop: number;
  target: number | null;
  shares: number;
  exit: number | null;
  /** Compact only — full Trade Review is a separate snapshot. */
  note: string;
};

export type StrategyReviewHandoff = {
  meta: {
    handoffVersion: string;
    generatedAt: string;
    reviewAsOf: string;
    dataCompleteness: "complete" | "partial" | "minimal";
    missingFields: string[];
  };
  identity: {
    ticker: string;
    stockFileId: string | null;
    planId: string;
    playbookId: string | null;
    family: string | null;
    createdAt: string;
    updatedAt: string;
  };
  strategicThesis: {
    thesis: string | null;
    strategicBias: string | null;
    strategicTimeframe: string | null;
    opportunityTimeframe: string | null;
    refinementTimeframe: string | null;
    invalidationConditions: string | null;
    importantNotes: string | null;
    stockFileStatus: string | null;
    currentHypothesis: string | null;
  };
  plan: {
    status: string;
    plannedEntry: number | null;
    maximumEntry: number | null;
    stopPrice: number | null;
    targetPrice: number | null;
    extendedTarget: number | null;
    minimumRR: number | null;
    plannedRisk: number | null;
    plannedRR: number | null;
    executionInstruction: string | null;
    expiresAt: string | null;
  };
  operationalState: {
    monitoringStatus: string;
    decisionState: string | null;
    lastDecision: unknown;
    linkedTradeId: string | null;
    outcome: TradePlan["outcome"] | null;
    learningSyncStatus: string | null;
    needsStrategyReview: boolean;
    needsLearningSyncRepair: boolean;
    needsOutcome: boolean;
  };
  marketObservation: {
    priceAtPlanCreation: HandoffPresence;
    currentPrice: HandoffPresence;
    lowestPriceSinceCreation: HandoffPresence;
    highestPriceSinceCreation: HandoffPresence;
    entryTouched: boolean | null | "not_recorded";
    entryTouchedAt: HandoffPresence;
    stopTouched: boolean | null | "not_recorded";
    stopTouchedAt: HandoffPresence;
    targetTouched: boolean | null | "not_recorded";
    targetTouchedAt: HandoffPresence;
    marketDataAsOf: HandoffPresence;
    marketDataSource: HandoffPresence;
    note: string;
  };
  history: {
    decisionUpdates: unknown[];
    reanalyses: "not_recorded";
    statusChanges: "not_recorded";
    previousLevels: "not_recorded";
    observations: Array<{
      id: string;
      status: string;
      startedAt?: string;
      concludedAt?: string | null;
    }>;
  };
  learning: {
    learningOutcome: LearningOutcome | null;
    counterfactualR: number | null | "not_recorded";
    missedReason: string | null | "not_recorded";
    attribution: "not_recorded" | unknown;
    maf: MafExperiment | null;
    learningObservations: Array<{
      id: string;
      status: string;
    }>;
    linkedTradeSummary: StrategyReviewLinkedTradeSummary | null;
  };
  aiReviewRequest: {
    questions: string[];
  };
};

function numOrNull(v: number | undefined | null): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function strOrNull(v: string | undefined | null): string | null {
  const t = v?.trim();
  return t ? t : null;
}

function findLearningOutcome(
  plan: TradePlan,
  los: LearningOutcome[]
): LearningOutcome | null {
  const byId = plan.outcome?.learningOutcomeId;
  if (byId) {
    const hit = los.find((lo) => lo.id.toUpperCase() === byId.toUpperCase());
    if (hit) return hit;
  }
  const byPlan = los.find(
    (lo) =>
      lo.planId?.toUpperCase() === plan.id.toUpperCase() && !lo.tradeId
  );
  return byPlan ?? null;
}

function findLinkedTrade(plan: TradePlan, trade?: Trade | null): Trade | null {
  if (trade) return trade;
  return null;
}

function compactTrade(trade: Trade): StrategyReviewLinkedTradeSummary {
  return {
    tradeId: trade.id,
    status: trade.status,
    entry: trade.entry,
    stop: trade.stop,
    target: trade.target ?? null,
    shares: trade.shares,
    exit: trade.exit ?? null,
    note: "Compact Trade summary only — use Trade Review snapshot for full forensic.",
  };
}

function touchedFromOutcome(
  value: boolean | null | undefined
): boolean | null | "not_recorded" {
  if (value === true || value === false) return value;
  if (value === null) return null;
  return "not_recorded";
}

/**
 * Build the canonical read-only Strategy Review projection.
 * Does not write stores. Does not invent prices.
 */
export function buildStrategyReviewHandoff(
  input: StrategyReviewHandoffInput
): StrategyReviewHandoff {
  const now = input.now ?? new Date().toISOString();
  const plan = input.plan;
  const thesis = input.stockThesis ?? null;
  const los = input.learningOutcomes ?? [];
  const observations = input.observations ?? [];
  const mafExperiments = input.mafExperiments ?? [];
  const lo = findLearningOutcome(plan, los);
  const linkedTrade = findLinkedTrade(plan, input.linkedTrade);
  const needsOutcome = planNeedsStrategyReview(plan);
  const needsSync = planNeedsLearningSyncRepair(plan);
  const missingFields: string[] = [];

  if (!thesis) missingFields.push("identity.stockFileId / strategicThesis");
  if (plan.plannedEntry === undefined) missingFields.push("plan.plannedEntry");
  if (plan.stopPrice === undefined) missingFields.push("plan.stopPrice");
  if (plan.targetPrice === undefined) missingFields.push("plan.targetPrice");
  if (!plan.executionInstruction?.trim()) {
    missingFields.push("plan.executionInstruction");
  }
  if (!plan.outcome?.recordedAt && needsOutcome) {
    missingFields.push("operationalState.outcome");
  }
  if (!lo && plan.outcome?.recordedAt) {
    missingFields.push("learning.learningOutcome");
  }
  // Market prices are never on TradePlan — always missing unless later wired from a real feed.
  missingFields.push(
    "marketObservation.priceAtPlanCreation",
    "marketObservation.currentPrice",
    "marketObservation.lowestPriceSinceCreation",
    "marketObservation.highestPriceSinceCreation",
    "marketObservation.marketDataAsOf",
    "marketObservation.marketDataSource"
  );

  const o = plan.outcome;
  const entryTouched = touchedFromOutcome(
    o?.entryReached ?? o?.entryTriggered
  );
  const stopTouched = touchedFromOutcome(o?.stopTriggered);
  const targetTouched = touchedFromOutcome(o?.targetTriggered);

  if (entryTouched === "not_recorded") {
    missingFields.push("marketObservation.entryTouched");
  }
  if (stopTouched === "not_recorded") {
    missingFields.push("marketObservation.stopTouched");
  }
  if (targetTouched === "not_recorded") {
    missingFields.push("marketObservation.targetTouched");
  }

  const planObs = observations.filter(
    (obs) => obs.planId?.toUpperCase() === plan.id.toUpperCase()
  );
  const maf =
    (lo?.mafExperimentId
      ? mafExperiments.find(
          (m) => m.id.toUpperCase() === lo.mafExperimentId!.toUpperCase()
        )
      : undefined) ?? null;

  let dataCompleteness: StrategyReviewHandoff["meta"]["dataCompleteness"] =
    "partial";
  if (!thesis && !o) dataCompleteness = "minimal";
  else if (
    thesis &&
    plan.plannedEntry !== undefined &&
    plan.stopPrice !== undefined &&
    (!needsOutcome || Boolean(o?.recordedAt)) &&
    (!o?.recordedAt || lo) &&
    !needsSync
  ) {
    // Still partial because market prices are never invented.
    dataCompleteness = "partial";
  }

  const counterfactualR =
    lo?.counterfactualR !== undefined && lo.counterfactualR !== null
      ? lo.counterfactualR
      : o?.theoreticalResultR !== undefined && o.theoreticalResultR !== null
        ? o.theoreticalResultR
        : ("not_recorded" as const);

  const missedReason =
    o?.nonExecutionReason ??
    o?.reason ??
    (lo?.kind === "missed_opportunity" || lo?.kind === "unexecuted_plan_loss"
      ? lo.kind
      : null) ??
    ("not_recorded" as const);

  const historical = thesis?.historicalAnalysis ?? [];
  const strategicTf = historical[0]?.timeframe ?? null;
  const opportunityTf =
    plan.analysisTimeframes?.[0] ?? historical[1]?.timeframe ?? null;
  const refinementTf =
    plan.entryTimeframe ?? historical[2]?.timeframe ?? null;

  return {
    meta: {
      handoffVersion: STRATEGY_REVIEW_HANDOFF_VERSION,
      generatedAt: now,
      reviewAsOf: now,
      dataCompleteness,
      missingFields: [...new Set(missingFields)],
    },
    identity: {
      ticker: plan.ticker.toUpperCase(),
      stockFileId: plan.stockThesisId ?? thesis?.id ?? null,
      planId: plan.id,
      playbookId: plan.playbookId ?? null,
      family: thesis?.style ?? null,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    },
    strategicThesis: {
      thesis: strOrNull(thesis?.thesis) ?? strOrNull(plan.thesis),
      strategicBias: strOrNull(thesis?.style),
      strategicTimeframe: strategicTf,
      opportunityTimeframe: opportunityTf,
      refinementTimeframe: refinementTf,
      invalidationConditions: strOrNull(thesis?.riskRules?.invalidation),
      importantNotes:
        strOrNull(thesis?.notes) ??
        strOrNull(thesis?.riskRules?.notes) ??
        strOrNull(plan.chatNotes),
      stockFileStatus: thesis?.status ?? null,
      currentHypothesis: strOrNull(thesis?.currentHypothesis),
    },
    plan: {
      status: plan.status,
      plannedEntry: numOrNull(plan.plannedEntry),
      maximumEntry: null, // not a TradePlan field — never invent
      stopPrice: numOrNull(plan.stopPrice),
      targetPrice: numOrNull(plan.targetPrice),
      extendedTarget: numOrNull(thesis?.levels?.targets?.[1] ?? null),
      minimumRR: numOrNull(thesis?.riskRules?.minimumRR),
      plannedRisk: null, // not on TradePlan root — never invent
      plannedRR: numOrNull(plan.plannedRR),
      executionInstruction: strOrNull(plan.executionInstruction),
      expiresAt: strOrNull(plan.validUntil),
    },
    operationalState: {
      monitoringStatus: plan.status,
      decisionState: plan.decision?.verdict ?? plan.scoutLifecycle ?? null,
      lastDecision: plan.decision ?? null,
      linkedTradeId: plan.linkedTradeId ?? linkedTrade?.id ?? null,
      outcome: o ?? null,
      learningSyncStatus: o?.learningSyncStatus ?? null,
      needsStrategyReview: needsOutcome,
      needsLearningSyncRepair: needsSync,
      needsOutcome,
    },
    marketObservation: {
      priceAtPlanCreation: "not_recorded",
      currentPrice: "not_recorded",
      lowestPriceSinceCreation: "not_recorded",
      highestPriceSinceCreation: "not_recorded",
      entryTouched,
      entryTouchedAt: "not_recorded",
      stopTouched,
      stopTouchedAt: "not_recorded",
      targetTouched,
      targetTouchedAt: "not_recorded",
      marketDataAsOf: "not_recorded",
      marketDataSource: "not_recorded",
      note: "No live market feed in this projection. Touch flags come only from plan.outcome when recorded; otherwise not_recorded.",
    },
    history: {
      decisionUpdates: plan.decisionHistory ?? [],
      reanalyses: "not_recorded",
      statusChanges: "not_recorded",
      previousLevels: "not_recorded",
      observations: planObs.map((obs) => ({
        id: obs.id,
        status: obs.status,
        startedAt: obs.startedAt,
        concludedAt: obs.concludedAt ?? null,
      })),
    },
    learning: {
      learningOutcome: lo,
      counterfactualR,
      missedReason:
        typeof missedReason === "string" || missedReason === "not_recorded"
          ? missedReason
          : "not_recorded",
      attribution: maf?.attributions ?? "not_recorded",
      maf,
      learningObservations: planObs.map((obs) => ({
        id: obs.id,
        status: obs.status,
      })),
      linkedTradeSummary: linkedTrade ? compactTrade(linkedTrade) : null,
    },
    aiReviewRequest: {
      questions: [
        "Is the strategic thesis still valid?",
        "Was the planned entry reached?",
        "Did the price move without entry?",
        "What is the correct Scout status?",
        "Is plan-outcome required?",
        "Is Learning sync required?",
        "What should be done now?",
      ],
    },
  };
}

/** Deterministic JSON text for clipboard (stable key order via JSON.stringify of built object). */
export function formatStrategyReviewHandoffText(
  handoff: StrategyReviewHandoff
): string {
  const body = [
    "=== MTA STRATEGY REVIEW HANDOFF ===",
    "",
    "META",
    JSON.stringify(handoff.meta, null, 2),
    "",
    "IDENTITY",
    JSON.stringify(handoff.identity, null, 2),
    "",
    "STRATEGIC_THESIS",
    JSON.stringify(handoff.strategicThesis, null, 2),
    "",
    "PLAN",
    JSON.stringify(handoff.plan, null, 2),
    "",
    "OPERATIONAL_STATE",
    JSON.stringify(handoff.operationalState, null, 2),
    "",
    "MARKET_OBSERVATION",
    JSON.stringify(handoff.marketObservation, null, 2),
    "",
    "HISTORY",
    JSON.stringify(handoff.history, null, 2),
    "",
    "LEARNING",
    JSON.stringify(handoff.learning, null, 2),
    "",
    "AI_REVIEW_REQUEST",
    JSON.stringify(handoff.aiReviewRequest, null, 2),
    "",
    "MISSING_FIELDS",
    handoff.meta.missingFields.length
      ? handoff.meta.missingFields.map((f) => `- ${f}`).join("\n")
      : "- (none listed)",
    "",
    "LEDGER_RULES",
    "- Scout counterfactual R is NOT Trade P/L.",
    "- Do not invent market prices.",
    "- Active Scouts may have null outcome.",
    "- Compact linked Trade summary is not a full Trade Review.",
  ].join("\n");
  return body;
}

export function strategyReviewSnapshotItem(
  input: StrategyReviewHandoffInput
): SnapshotMenuItem {
  const handoff = buildStrategyReviewHandoff(input);
  const label = `${STRATEGY_REVIEW_SNAPSHOT_LABEL} · ${handoff.identity.ticker} · ${handoff.identity.planId}`;
  return {
    id: STRATEGY_REVIEW_SNAPSHOT_ID,
    label: STRATEGY_REVIEW_SNAPSHOT_LABEL,
    description: `Read-only strategy projection for external AI · completeness ${handoff.meta.dataCompleteness}`,
    text: wrapSnapshotText(label, formatStrategyReviewHandoffText(handoff)),
  };
}

/** Resolve linked trade from a list without inventing links. */
export function resolveLinkedTradeForPlan(
  plan: TradePlan,
  trades: Trade[]
): Trade | null {
  if (plan.linkedTradeId) {
    return (
      trades.find(
        (t) => t.id.toUpperCase() === plan.linkedTradeId!.toUpperCase()
      ) ?? null
    );
  }
  const byPlan = trades.find(
    (t) => t.planId?.toUpperCase() === plan.id.toUpperCase()
  );
  return byPlan ?? null;
}
