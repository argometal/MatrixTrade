import { buildPlanEnterHref } from "./plan-helpers";
import { PLAN_STATUS_LABELS, type PlanStatus, type TradePlan } from "./plan-types";

/** Scout plan ready for execution layer — one row per active prospect. */
export type TradeProspect = {
  planId: string;
  ticker: string;
  stockThesisId?: string;
  status: PlanStatus;
  entry?: number;
  stop?: number;
  target?: number;
  plannedRR?: number;
  playbookId?: string;
  thesisSnippet?: string;
  verdict?: string;
  enterHref: string;
};

function isExecutableProspect(plan: TradePlan): boolean {
  if (plan.status !== "watching" && plan.status !== "ready") return false;
  if (plan.plannedEntry === undefined || plan.stopPrice === undefined) return false;
  return true;
}

function prospectSortRank(plan: TradePlan): number {
  if (plan.status === "ready") return 0;
  if (plan.decision?.verdict === "go") return 1;
  if (plan.decision?.verdict === "probe") return 2;
  if (plan.status === "watching") return 3;
  return 4;
}

export function buildTradeProspects(plans: TradePlan[]): TradeProspect[] {
  return plans
    .filter(isExecutableProspect)
    .sort((a, b) => {
      const rank = prospectSortRank(a) - prospectSortRank(b);
      if (rank !== 0) return rank;
      return a.ticker.localeCompare(b.ticker) || a.id.localeCompare(b.id);
    })
    .map((plan) => ({
      planId: plan.id,
      ticker: plan.ticker,
      stockThesisId: plan.stockThesisId,
      status: plan.status,
      entry: plan.plannedEntry,
      stop: plan.stopPrice,
      target: plan.targetPrice,
      plannedRR: plan.plannedRR,
      playbookId: plan.playbookId,
      thesisSnippet: plan.thesis?.trim() || plan.decision?.reasoning?.trim(),
      verdict: plan.decision?.verdict,
      enterHref: buildPlanEnterHref(plan),
    }));
}

export function formatTradeProspectLabel(prospect: TradeProspect): string {
  const status = PLAN_STATUS_LABELS[prospect.status];
  const levels =
    prospect.entry !== undefined && prospect.stop !== undefined
      ? ` · $${prospect.entry.toFixed(0)}/$${prospect.stop.toFixed(0)}${
          prospect.target !== undefined ? `→$${prospect.target.toFixed(0)}` : ""
        }`
      : "";
  const rr = prospect.plannedRR !== undefined ? ` · ${prospect.plannedRR.toFixed(1)}R` : "";
  const verdict = prospect.verdict ? ` · ${prospect.verdict}` : "";
  return `${prospect.ticker} · ${prospect.planId} · ${status}${verdict}${levels}${rr}`;
}

export function findTradeProspect(
  prospects: TradeProspect[],
  planId?: string
): TradeProspect | undefined {
  if (!planId?.trim()) return undefined;
  const id = planId.trim().toUpperCase();
  return prospects.find((p) => p.planId.toUpperCase() === id);
}

export function prospectToPrefill(prospect: TradeProspect) {
  return {
    planId: prospect.planId,
    ticker: prospect.ticker,
    playbookId: prospect.playbookId,
    entry: prospect.entry !== undefined ? String(prospect.entry) : undefined,
    stop: prospect.stop !== undefined ? String(prospect.stop) : undefined,
    target: prospect.target !== undefined ? String(prospect.target) : undefined,
  };
}
