import type { InsightsCaseRow } from "./insights-case-spine-types";
import type { PipelinePerformanceFilters } from "./insights-pipeline-performance";
import type { LearningOutcome } from "./learning-outcome-types";
import type { TradePlan } from "./plan-types";
import type { Trade } from "./types";
import {
  isDuplicateEconomicObservation,
} from "./duplicate-observation";
import {
  buildSequenceResearchUniverse,
  type ResearchUniverseDescriptor,
} from "./research-universe";

export type OpportunitySequenceComparisonSource = {
  plans: TradePlan[];
  trades: Trade[];
  learningOutcomes: LearningOutcome[];
  caseSpine: InsightsCaseRow[];
};

export type OpportunitySequenceAttempt = {
  attemptNumber: number;
  tradeId: string;
  tradeStatus: Trade["status"];
  orderedAt: string | null;
  orderingAvailable: boolean;
  planId: string | null;
  realizedR: number | null;
  cumulativeRealizedR: number | null;
  plannedRR: number | null;
  plannedEntry: number | null;
  stopPrice: number | null;
  targetPrice: number | null;
  supportLevel: number | null;
  playbookId: string | null;
  trendIntegrity: string | null;
  familyBState: string | null;
  pullbackQuality: string | null;
  geometryRelationToPrior: "first_attempt" | "same_geometry" | "changed_geometry" | "indeterminate";
};

export type OpportunitySequenceRow = {
  opportunityKey: string;
  ticker: string;
  stockThesisId: string | null;
  canonicalLineage: boolean;
  planIds: string[];
  actualAttemptCount: number;
  cumulativeActualRealizedR: number | null;
  sameGeometryAttemptCount: number;
  changedGeometryAttemptCount: number;
  indeterminateGeometryAttemptCount: number;
  supportEvidenceAvailable: boolean;
  trendEvidenceAvailable: boolean;
  playbookIds: string[];
  attempts: OpportunitySequenceAttempt[];
};

export type OpportunitySequenceIndeterminateLineage = {
  ticker: string;
  stockThesisId: string | null;
  planIds: string[];
  reason: string;
};

export type OpportunitySequenceComparisonView = {
  eligibleOpportunityCount: number;
  actualAttemptCount: number;
  multiAttemptOpportunityCount: number;
  duplicateZeroWeightCount: number;
  indeterminateLineageCount: number;
  actualExecutedOpportunityCount: number;
  researchUniverse: ResearchUniverseDescriptor;
  rows: OpportunitySequenceRow[];
  indeterminateLineage: OpportunitySequenceIndeterminateLineage[];
  summaryNote: string;
};

function inRange(iso: string | undefined, from?: string, to?: string): boolean {
  if (!iso) return true;
  if (!from && !to) return true;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  if (from && t < Date.parse(from)) return false;
  if (to && t > Date.parse(to)) return false;
  return true;
}

function passesFilters(
  row: { ticker: string; playbookId: string | null; date: string },
  filters: Pick<PipelinePerformanceFilters, "from" | "to" | "ticker" | "playbookId">
): boolean {
  if (filters.ticker && row.ticker.toUpperCase() !== filters.ticker.toUpperCase()) return false;
  if (filters.playbookId && row.playbookId !== filters.playbookId) return false;
  if (!inRange(row.date, filters.from, filters.to)) return false;
  return true;
}

function keyForLineage(plan: TradePlan): string {
  return `${plan.stockThesisId ?? "__NO_STOCK_THESIS__"}::${plan.ticker.toUpperCase()}`;
}

function orderedPlanDate(plan: TradePlan, row: InsightsCaseRow | null): string {
  return plan.decision?.decidedAt ?? row?.date ?? plan.updatedAt ?? plan.createdAt;
}

function chainForPlan(plan: TradePlan, byId: Map<string, TradePlan>): TradePlan[] {
  const backward: TradePlan[] = [];
  const seen = new Set<string>();
  let cursor: TradePlan | undefined = plan;
  while (cursor) {
    const key = cursor.id.toUpperCase();
    if (seen.has(key)) break;
    seen.add(key);
    backward.unshift(cursor);
    cursor = cursor.replacesPlanId ? byId.get(cursor.replacesPlanId.toUpperCase()) : undefined;
  }

  const ordered = [...backward];
  cursor = ordered[ordered.length - 1];
  while (cursor?.replacedByPlanId) {
    const next = byId.get(cursor.replacedByPlanId.toUpperCase());
    if (!next || seen.has(next.id.toUpperCase())) break;
    seen.add(next.id.toUpperCase());
    ordered.push(next);
    cursor = next;
  }
  return ordered;
}

function round(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Number(value.toFixed(4));
}

function sameNumber(a: number | undefined, b: number | undefined): boolean {
  if (a == null || b == null) return false;
  return Math.abs(a - b) < 0.0001;
}

function geometryRelation(
  current: TradePlan | undefined,
  prior: TradePlan | undefined
): OpportunitySequenceAttempt["geometryRelationToPrior"] {
  if (!current) return "indeterminate";
  if (!prior) return "first_attempt";
  const currentReady =
    current.plannedEntry != null && current.stopPrice != null && current.targetPrice != null;
  const priorReady =
    prior.plannedEntry != null && prior.stopPrice != null && prior.targetPrice != null;
  if (!currentReady || !priorReady) return "indeterminate";
  return sameNumber(current.plannedEntry, prior.plannedEntry) &&
    sameNumber(current.stopPrice, prior.stopPrice) &&
    sameNumber(current.targetPrice, prior.targetPrice)
    ? "same_geometry"
    : "changed_geometry";
}

function sumRealizedR(values: Array<number | null>): number | null {
  let sum = 0;
  let saw = false;
  for (const value of values) {
    if (value == null || !Number.isFinite(value)) continue;
    sum += value;
    saw = true;
  }
  return saw ? round(sum) : null;
}

function compareTradeOrder(a: OpportunitySequenceAttempt, b: OpportunitySequenceAttempt): number {
  if (a.orderedAt && b.orderedAt) return a.orderedAt.localeCompare(b.orderedAt);
  if (a.orderedAt && !b.orderedAt) return -1;
  if (!a.orderedAt && b.orderedAt) return 1;
  return a.tradeId.localeCompare(b.tradeId);
}

export function computeOpportunitySequenceComparison(input: {
  source: OpportunitySequenceComparisonSource;
  filters?: Pick<PipelinePerformanceFilters, "from" | "to" | "ticker" | "playbookId">;
}): OpportunitySequenceComparisonView {
  const filters = input.filters ?? {};
  const byPlanRow = new Map(
    input.source.caseSpine.map((row) => [row.planId.toUpperCase(), row] as const)
  );
  const byPlanId = new Map(
    input.source.plans.map((plan) => [plan.id.toUpperCase(), plan] as const)
  );
  const loByPlan = new Map<string, LearningOutcome>();
  for (const lo of input.source.learningOutcomes) {
    if (!lo.planId) continue;
    const key = lo.planId.toUpperCase();
    if (!loByPlan.has(key)) loByPlan.set(key, lo);
  }

  const filteredPlans = input.source.plans.filter((plan) => {
    const row = byPlanRow.get(plan.id.toUpperCase()) ?? null;
    if (!row || row.caseOrigin === "historical_trade") return false;
    if (row.independentEconomicObservation === false) return false;
    if (
      isDuplicateEconomicObservation({
        plan,
        learningOutcome: loByPlan.get(plan.id.toUpperCase()) ?? null,
      })
    ) {
      return false;
    }
    return passesFilters(
      {
        ticker: plan.ticker,
        playbookId: plan.playbookId ?? null,
        date: orderedPlanDate(plan, row),
      },
      filters
    );
  });

  const filteredPlanIds = new Set(filteredPlans.map((plan) => plan.id.toUpperCase()));
  const filteredTrades = input.source.trades.filter((trade) => {
    const key = trade.planId?.toUpperCase();
    if (!key || !filteredPlanIds.has(key)) return false;
    const plan = byPlanId.get(key);
    if (!plan) return false;
    const row = byPlanRow.get(key) ?? null;
    return passesFilters(
      {
        ticker: trade.ticker,
        playbookId: trade.playbookId ?? plan.playbookId ?? null,
        date: trade.openedAt ?? trade.createdAt ?? trade.closedAt ?? orderedPlanDate(plan, row),
      },
      filters
    );
  });

  const duplicates = input.source.learningOutcomes.filter((lo) => {
    if (lo.kind !== "duplicate_creation") return false;
    const key = lo.planId?.toUpperCase();
    if (!key) return false;
    const plan = byPlanId.get(key);
    const row = byPlanRow.get(key) ?? null;
    if (!plan || !row || row.caseOrigin === "historical_trade") return false;
    return passesFilters(
      {
        ticker: lo.ticker,
        playbookId: lo.playbookId ?? plan.playbookId ?? null,
        date: lo.updatedAt ?? lo.createdAt ?? orderedPlanDate(plan, row),
      },
      filters
    );
  });

  const groups = new Map<string, TradePlan[]>();
  const canonicalLineageKeys = new Set<string>();
  for (const plan of filteredPlans) {
    const chain = chainForPlan(plan, byPlanId).filter((item) => filteredPlanIds.has(item.id.toUpperCase()));
    const chainKey = chain.map((item) => item.id.toUpperCase()).join("->");
    if (chain.length > 1) canonicalLineageKeys.add(chainKey);
    if (!groups.has(chainKey)) groups.set(chainKey, chain);
  }

  const tradesByGroup = new Map<string, Trade[]>();
  for (const trade of filteredTrades) {
    const plan = trade.planId ? byPlanId.get(trade.planId.toUpperCase()) : undefined;
    if (!plan) continue;
    const chain = chainForPlan(plan, byPlanId).filter((item) => filteredPlanIds.has(item.id.toUpperCase()));
    const chainKey = chain.map((item) => item.id.toUpperCase()).join("->");
    const existing = tradesByGroup.get(chainKey) ?? [];
    existing.push(trade);
    tradesByGroup.set(chainKey, existing);
  }

  const rows: OpportunitySequenceRow[] = [];
  for (const [groupKey, plans] of groups) {
    const trades = tradesByGroup.get(groupKey) ?? [];
    if (trades.length === 0) continue;
    const attempts: OpportunitySequenceAttempt[] = trades
      .map((trade) => {
        const plan = trade.planId ? byPlanId.get(trade.planId.toUpperCase()) : undefined;
        return {
          attemptNumber: 0,
          tradeId: trade.id,
          tradeStatus: trade.status,
          orderedAt: trade.openedAt ?? trade.createdAt ?? trade.closedAt ?? null,
          orderingAvailable: Boolean(trade.openedAt ?? trade.createdAt ?? trade.closedAt),
          planId: plan?.id ?? trade.planId ?? null,
          realizedR: trade.riskRewardActual ?? null,
          cumulativeRealizedR: null,
          plannedRR: plan?.plannedRR ?? null,
          plannedEntry: plan?.plannedEntry ?? null,
          stopPrice: plan?.stopPrice ?? null,
          targetPrice: plan?.targetPrice ?? null,
          supportLevel: plan?.supportLevel ?? null,
          playbookId: trade.playbookId ?? plan?.playbookId ?? null,
          trendIntegrity: plan?.familyBAssessment?.trendIntegrity ?? null,
          familyBState: plan?.familyBAssessment?.state ?? null,
          pullbackQuality: plan?.familyBAssessment?.pullbackQuality ?? null,
          geometryRelationToPrior: "first_attempt",
        } satisfies OpportunitySequenceAttempt;
      })
      .sort(compareTradeOrder);

    let running = 0;
    let sawRunning = false;
    for (let i = 0; i < attempts.length; i += 1) {
      const attempt = attempts[i]!;
      attempt.attemptNumber = i + 1;
      const currentPlan =
        attempt.planId != null ? byPlanId.get(attempt.planId.toUpperCase()) : undefined;
      const priorPlan =
        i > 0 && attempts[i - 1]?.planId
          ? byPlanId.get(attempts[i - 1]!.planId!.toUpperCase())
          : undefined;
      attempt.geometryRelationToPrior = geometryRelation(currentPlan, priorPlan);
      if (attempt.realizedR != null && Number.isFinite(attempt.realizedR)) {
        running += attempt.realizedR;
        sawRunning = true;
        attempt.cumulativeRealizedR = round(running);
      } else {
        attempt.cumulativeRealizedR = sawRunning ? round(running) : null;
      }
    }

    const firstPlan = plans[0] ?? (attempts[0]?.planId ? byPlanId.get(attempts[0]!.planId!.toUpperCase()) : undefined);
    rows.push({
      opportunityKey: firstPlan?.id ?? groupKey,
      ticker: firstPlan?.ticker ?? trades[0]!.ticker,
      stockThesisId: firstPlan?.stockThesisId ?? null,
      canonicalLineage: canonicalLineageKeys.has(groupKey),
      planIds: plans.map((plan) => plan.id),
      actualAttemptCount: attempts.length,
      cumulativeActualRealizedR: sumRealizedR(attempts.map((attempt) => attempt.realizedR)),
      sameGeometryAttemptCount: attempts.filter((attempt) => attempt.geometryRelationToPrior === "same_geometry").length,
      changedGeometryAttemptCount: attempts.filter((attempt) => attempt.geometryRelationToPrior === "changed_geometry").length,
      indeterminateGeometryAttemptCount: attempts.filter((attempt) => attempt.geometryRelationToPrior === "indeterminate").length,
      supportEvidenceAvailable: attempts.some((attempt) => attempt.supportLevel != null),
      trendEvidenceAvailable: attempts.some((attempt) => attempt.trendIntegrity != null),
      playbookIds: [...new Set(attempts.map((attempt) => attempt.playbookId).filter((value): value is string => Boolean(value)))],
      attempts,
    });
  }

  const indeterminateLineage: OpportunitySequenceIndeterminateLineage[] = [];
  const plansByLineageKey = new Map<string, TradePlan[]>();
  for (const plan of filteredPlans) {
    const key = keyForLineage(plan);
    const existing = plansByLineageKey.get(key) ?? [];
    existing.push(plan);
    plansByLineageKey.set(key, existing);
  }
  for (const group of plansByLineageKey.values()) {
    if (group.length < 2) continue;
    const linkedIds = new Set<string>();
    for (const plan of group) {
      if (plan.replacesPlanId) linkedIds.add(plan.id.toUpperCase());
      if (plan.replacedByPlanId) linkedIds.add(plan.id.toUpperCase());
    }
    if (linkedIds.size > 0) continue;
    group.sort((a, b) => orderedPlanDate(a, byPlanRow.get(a.id.toUpperCase()) ?? null).localeCompare(orderedPlanDate(b, byPlanRow.get(b.id.toUpperCase()) ?? null)));
    indeterminateLineage.push({
      ticker: group[0]!.ticker,
      stockThesisId: group[0]!.stockThesisId ?? null,
      planIds: group.map((plan) => plan.id),
      reason:
        "Multiple filtered Plans share ticker/stock thesis without canonical replace linkage. Not counted as one opportunity sequence.",
    });
  }

  rows.sort((a, b) => a.ticker.localeCompare(b.ticker) || a.opportunityKey.localeCompare(b.opportunityKey));

  const summaryNote =
    "Actual sequence accounting includes only executed Trade attempts linked canonically to Plans. No-execution Cases keep realized R at 0 and remain outside cumulative actual sequence R. Duplicate_creation has zero independent weight.";

  return {
    eligibleOpportunityCount: rows.length,
    actualAttemptCount: rows.reduce((sum, row) => sum + row.actualAttemptCount, 0),
    multiAttemptOpportunityCount: rows.filter((row) => row.actualAttemptCount > 1).length,
    duplicateZeroWeightCount: duplicates.length,
    indeterminateLineageCount: indeterminateLineage.length,
    actualExecutedOpportunityCount: rows.length,
    researchUniverse: buildSequenceResearchUniverse({
      eligibleOpportunityCount: rows.length,
      duplicateZeroWeightCount: duplicates.length,
      indeterminateLineageCount: indeterminateLineage.length,
      summaryNote,
    }),
    rows,
    indeterminateLineage,
    summaryNote,
  };
}
