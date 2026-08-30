import {
  computeAllPlaybookStats,
  computeProfitFactor,
} from "./analytics";
import { winRate } from "./calculate";
import { buildAttentionItems } from "./dashboard-attention";
import { fetchBridgeInbox } from "./bridge";
import { formatCycleLabel } from "./experiment-label";
import { getPlaybooks } from "./playbooks";
import {
  buildEquityCurve,
  computeAvgR,
  computeExpectancy,
  computeMistakeStats,
} from "./review";
import { buildPlanAttentionItems } from "./plan-attention";
import { buildLearningAttentionItems } from "./learning-attention";
import { enrichAttentionItemsWithAiSnapshots } from "./needs-attention-ai";
import { countActivePlans, countPlansNeedingReview } from "./plan-helpers";
import { getPlans } from "./plans";
import { buildScoutMonitoringSections } from "./scout-monitoring";
import { getExperiment, getMonthlyRisk, getTrades } from "./storage";
import { getStockTheses } from "./stock-theses";
import { getObservations } from "./observation-store";
import { getLearningOutcomes } from "./learning-outcome-store";
import { listAllPendingInboxItems } from "./trading-inbox-storage";
import { buildExpiredReservationAttentionItems } from "./capital-account";
import { listCapitalReservations } from "./capital-reservation";
import type { DashboardData } from "./dashboard-types";
import type { Experiment } from "./types";
import type { MonthlyRisk } from "./monthly-risk";
import { autoRetryPlansNeedingLearningSync } from "./plan-outcome-learning-sync";

export type { DashboardData } from "./dashboard-types";
export { formatDashboardUsd, formatDashboardPf } from "./dashboard-display";

function emptyExperiment(): Experiment {
  return {
    realizedPnL: 0,
    grossLoss: 0,
    closedTrades: 0,
    wins: 0,
    losses: 0,
  };
}

function emptyMonthly(): MonthlyRisk {
  return {
    monthKey: new Date().toISOString().slice(0, 7),
    monthlyLossLimit: -300,
    baseCap: 300,
    carryoverIn: 0,
    carryoverEnabled: true,
    monthlyAllowance: 300,
    monthlyRoomCap: 300,
    lossUsedThisMonth: 0,
    effectiveLossCap: -300,
    previousMonthLossUsed: 0,
    monthlyRealizedPnL: 0,
    monthlyLossRoom: 0,
    monthlyCapBreached: false,
    closedTradesThisMonth: 0,
    closedTradesPreviousMonth: 0,
    previousMonthKey: "",
  };
}

async function settledValue<T>(
  promise: Promise<T>,
  fallback: T,
  label: string
): Promise<{ value: T; error?: string }> {
  try {
    return { value: await promise };
  } catch (err) {
    console.error(`loadDashboardData ${label} failed:`, err);
    return {
      value: fallback,
      error: err instanceof Error ? err.message : `${label} unavailable`,
    };
  }
}

export async function loadDashboardData(): Promise<DashboardData> {
  const [
    experimentR,
    monthlyR,
    tradesR,
    playbooksR,
    workerInboxR,
    plansR,
    stockThesesR,
    observationsR,
    learningOutcomesR,
    reservationsR,
  ] = await Promise.all([
    settledValue(getExperiment(), emptyExperiment(), "experiment"),
    settledValue(getMonthlyRisk(), emptyMonthly(), "monthlyRisk"),
    settledValue(getTrades(), [], "trades"),
    settledValue(getPlaybooks(), [], "playbooks"),
    settledValue(fetchBridgeInbox(), [], "inbox"),
    settledValue(getPlans(), [], "plans"),
    settledValue(getStockTheses(), [], "stockTheses"),
    settledValue(getObservations(), [], "observations"),
    settledValue(getLearningOutcomes(), [], "learning"),
    settledValue(listCapitalReservations(), [], "capitalReservations"),
  ]);

  const experiment = experimentR.value;
  const monthly = monthlyR.value;
  const trades = tradesR.value;
  const playbooks = playbooksR.value;
  let plans = plansR.value;
  const stockTheses = stockThesesR.value;
  let observations = observationsR.value;
  let learningOutcomes = learningOutcomesR.value;
  const reservations = reservationsR.value;

  let pendingInbox: Awaited<ReturnType<typeof listAllPendingInboxItems>> = [];
  try {
    pendingInbox = await listAllPendingInboxItems(workerInboxR.value);
  } catch (err) {
    console.error("loadDashboardData inbox pending failed:", err);
  }

  // 16-01: auto-retry idempotent LO/OBS sync; ATTN only if still broken after.
  try {
    plans = await autoRetryPlansNeedingLearningSync(plans);
    const [loRefresh, obsRefresh] = await Promise.all([
      settledValue(getLearningOutcomes(), learningOutcomes, "learning-refresh"),
      settledValue(getObservations(), observations, "observations-refresh"),
    ]);
    learningOutcomes = loRefresh.value;
    observations = obsRefresh.value;
  } catch (err) {
    console.error("loadDashboardData learning sync auto-retry failed:", err);
  }

  const rawItems = [
    ...buildAttentionItems(trades, pendingInbox, playbooks, monthly),
    ...buildPlanAttentionItems(plans, learningOutcomes, observations),
    ...buildLearningAttentionItems(trades, observations, learningOutcomes),
    ...buildExpiredReservationAttentionItems(reservations).map((item) => ({
      id: item.id,
      label: item.title,
      href: `/mta/planning/capital`,
      priority: item.priority,
    })),
  ].sort((a, b) => a.priority - b.priority);

  let attentionItems;
  try {
    attentionItems = enrichAttentionItemsWithAiSnapshots(rawItems, {
      trades,
      plans,
      playbooks,
      stockTheses,
      observations,
      learningOutcomes,
      pendingInbox,
      monthly,
      experiment,
      reservations,
    });
  } catch (err) {
    console.error("loadDashboardData attention enrich failed:", err);
    attentionItems = rawItems;
  }

  const playbookStats = computeAllPlaybookStats(playbooks, trades).filter(
    (p) => p.playbookId !== null && p.closedCount > 0
  );

  const sectionErrors = [
    experimentR.error && `experiment: ${experimentR.error}`,
    monthlyR.error && `monthlyRisk: ${monthlyR.error}`,
    tradesR.error && `trades: ${tradesR.error}`,
    reservationsR.error && `capitalReservations: ${reservationsR.error}`,
    learningOutcomesR.error && `learning: ${learningOutcomesR.error}`,
    workerInboxR.error && `inbox: ${workerInboxR.error}`,
  ].filter(Boolean) as string[];

  return {
    experiment,
    monthly,
    cycleLabel: formatCycleLabel(experiment),
    openTrades: trades.filter((t) => t.status === "open").length,
    pendingReviews: trades.filter((t) => t.status === "closed" && !t.reviewedAt)
      .length,
    activePlaybooks: playbooks.filter((p) => p.status === "ACTIVE").length,
    testingPlaybooks: playbooks.filter((p) => p.status === "TESTING").length,
    activePlans: countActivePlans(plans),
    plansNeedingReview: countPlansNeedingReview(plans),
    attentionItems,
    scoutMonitoring: buildScoutMonitoringSections({ plans, trades, reservations }),
    mistakeStats: computeMistakeStats(trades),
    // Experiment cumulative P/L points — not Account Equity.
    equityPoints: buildEquityCurve(trades),
    winRate: winRate(experiment),
    profitFactor: computeProfitFactor(trades),
    expectancy: computeExpectancy(trades),
    avgR: computeAvgR(trades),
    bestPlaybook: playbookStats.length
      ? [...playbookStats].sort((a, b) => b.netPnL - a.netPnL)[0]
      : null,
    worstPlaybook: playbookStats.length
      ? [...playbookStats].sort((a, b) => a.netPnL - b.netPnL)[0]
      : null,
    sectionErrors,
  };
}
