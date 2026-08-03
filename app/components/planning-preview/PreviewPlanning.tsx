"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SnapshotButton } from "@/app/components/preview/SnapshotButton";
import { ScoutExecutePanel } from "@/app/components/planning-preview/ScoutExecutePanel";
import { PlanRecordOutcomePanel } from "@/app/components/planning-preview/PlanRecordOutcomePanel";
import { buildPlanLevelsView } from "@/lib/plan-levels-board";
import {
  planNeedsLearningSyncRepair,
  planNeedsStrategyReview,
} from "@/lib/plan-helpers";
import { scoutingVerdictStyle } from "@/lib/matrix-mechanics-brief";
import type { MarketEvidence } from "@/lib/market-evidence-types";
import type { MonthlyRisk } from "@/lib/monthly-risk";
import type { TradePlan } from "@/lib/plan-types";
import type { Playbook } from "@/lib/playbook-types";
import {
  resolveScoutingVerdict,
  type ScoutingVerdict,
} from "@/lib/scouting-types";
import {
  isActiveStockThesisStatus,
  STOCK_THESIS_STATUS_LABELS,
  formatStockThesisZone,
  type StockThesis,
} from "@/lib/stock-thesis-types";
import {
  PlanLevelsSidePanel,
  PlanMapSummaryLine,
  PlanMapToggleButton,
} from "./PlanLevelsSidePanel";
import { scoutDeskSnapshotItems, stockProfileSnapshotItems } from "@/lib/snapshot-packages";
import { snapshotButtonTitle } from "@/lib/snapshot-verification";
import type { SnapshotMenuItem } from "@/lib/snapshot-types";
import type { Experiment, Trade } from "@/lib/types";
import type { CapitalAccountSnapshot } from "@/lib/capital-account";
import type { CapitalReservation } from "@/lib/capital-types";
import {
  buildScoutFundingSnapshot,
  canonicalShareCount,
  scoutFundingSnapshotItem,
} from "@/lib/scout-funding-snapshot";
import { copyText } from "@/app/components/ai-bridge/copy-text";
import { useControlPanel } from "@/app/components/control-panel/MatrixControlPanelProvider";
import { buildTradeProposalBlock } from "@/lib/build-trade-proposal-block";
import { stashControlApplyDraft } from "@/lib/control-apply-draft";
import {
  incompleteTradesForTicker,
  orphanIncompleteTradeTickers,
  tradesForScoutCase,
} from "@/lib/scout-case-trades";
import {
  evaluateScoutOperationalState,
  compareScoutOperationalEvaluations,
  formatConsolidatedOperationalTag,
  formatOperationalR,
  formatOperationalStateLabel,
  buildOperationalStatusPreview,
  SCOUT_OPERATIONAL_STATUS_ACTIONS,
  type OperationalStatusPreview,
  type ScoutOperationalEvaluation,
} from "@/lib/scout-operational-state";
import { resolvePlannedRRFromPlan } from "@/lib/plan-risk";
import {
  buildTradeProspects,
  findTradeProspect,
  type TradeProspect,
} from "@/lib/trade-prospects";
import { ActiveScoutsComparisonTable } from "@/app/components/planning-preview/ActiveScoutsComparisonTable";
import { ScoutAllocationProvider } from "@/app/components/planning-preview/ScoutAllocationProvider";
import { ScoutAllocationImpact } from "@/app/components/planning-preview/ScoutAllocationImpact";
import { ScoutAllocationStrip } from "@/app/components/planning-preview/ScoutAllocationStrip";
import { ScoutFundingExecutionMenu } from "@/app/components/planning-preview/ScoutFundingExecutionMenu";
import { ScoutPrepareAllocationNote } from "@/app/components/planning-preview/ScoutPrepareAllocationNote";

const thesisStatusStyles: Record<string, string> = {
  draft: "bg-zinc-700/50 text-zinc-400",
  watching: "bg-sky-500/15 text-sky-300",
  actionable: "bg-emerald-500/15 text-emerald-400",
  invalidated: "bg-red-500/15 text-red-400",
  archived: "bg-zinc-700/50 text-zinc-500",
};

type ScoutCard = {
  key: string;
  thesis: StockThesis | null;
  ticker: string;
  thesisPlans: TradePlan[];
  primaryPlan: TradePlan | undefined;
  levelsView: ReturnType<typeof buildPlanLevelsView> | null;
  plannedRR?: number;
  verdict: ScoutingVerdict | null;
  activeScoutCount: number;
  linkedTrades: Trade[];
  orphan: boolean;
  operational: ScoutOperationalEvaluation;
};

function fallbackOperationalEvaluation(): ScoutOperationalEvaluation {
  return {
    detectedAssessment: {
      thesisState: "unknown",
      operationalState: "unassessed",
      waitHorizon: "unknown",
      nextAction: "none",
      freshness: "unknown",
      plannedRR: undefined,
      currentExecutableRR: undefined,
      reviewRequired: true,
      reasonCodes: ["legacy_unassessed"],
      source: "legacy",
    },
    mismatch: false,
    alerts: [],
  };
}

function resolveScoutCardPlannedRR(
  primaryPlan: TradePlan | undefined,
  levelsView: ReturnType<typeof buildPlanLevelsView> | null
): number | undefined {
  if (primaryPlan?.plannedRR !== undefined && Number.isFinite(primaryPlan.plannedRR)) {
    return primaryPlan.plannedRR;
  }
  if (primaryPlan) {
    const fromLevels = resolvePlannedRRFromPlan(primaryPlan);
    if (fromLevels !== undefined) return fromLevels;
  }
  if (levelsView?.plannedRR !== undefined && Number.isFinite(levelsView.plannedRR)) {
    return levelsView.plannedRR;
  }
  return undefined;
}

/**
 * Scout war room — one selected case in detail (radiografía + execute).
 * Migrated Enter Trade capabilities live in ScoutExecutePanel → Control.
 */
export function PreviewPlanning({
  plans,
  playbooks,
  stockTheses,
  marketEvidence,
  monthly,
  experiment,
  trades,
  suggestedTradeId,
  focusPlanId,
  focusThesisId,
  snapshotItems: initialSnapshotItems,
  reservations = [],
  capitalAccount = null,
  capitalConfigurationPresent,
}: {
  plans: TradePlan[];
  playbooks: Playbook[];
  stockTheses: StockThesis[];
  marketEvidence: MarketEvidence[];
  monthly: MonthlyRisk;
  experiment: Experiment;
  trades: Trade[];
  suggestedTradeId: string;
  focusPlanId?: string;
  focusThesisId?: string;
  snapshotItems: SnapshotMenuItem[];
  reservations?: CapitalReservation[];
  capitalAccount?: CapitalAccountSnapshot | null;
  capitalConfigurationPresent?: boolean;
}) {
  const { openPanel } = useControlPanel();
  const [scoutCaseKey, setScoutCaseKey] = useState<string | null>(focusThesisId ?? null);
  /** Explicit plan for Record Outcome / Retry Sync when primaryPlan is a live Scout. */
  const [learningFocusPlanId, setLearningFocusPlanId] = useState<string | null>(null);
  const [planPanelOpen, setPlanPanelOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsSection, setDetailsSection] = useState<
    "thesis" | "invalidation" | "fills" | "evidence" | null
  >(null);
  const [prepareMsg, setPrepareMsg] = useState("");
  const [quickOperationalPhrase, setQuickOperationalPhrase] = useState("");
  const [quickOperationalMsg, setQuickOperationalMsg] = useState("");
  const [quickOperationalError, setQuickOperationalError] = useState("");
  const [operationalClipboardOk, setOperationalClipboardOk] = useState<boolean | null>(
    null
  );
  const [operationalPreview, setOperationalPreview] =
    useState<OperationalStatusPreview | null>(null);

  const activeTheses = useMemo(
    () => stockTheses.filter((t) => isActiveStockThesisStatus(t.status)),
    [stockTheses]
  );

  const prospects = useMemo(() => buildTradeProspects(plans), [plans]);

  const scoutCards = useMemo((): ScoutCard[] => {
    const fromTheses: ScoutCard[] = activeTheses.map((thesis) => {
      const thesisPlans = plans.filter((p) => p.stockThesisId === thesis.id);
      const activePlans = thesisPlans.filter((p) => p.status === "watching" || p.status === "ready");
      // Prefer live plan; else close the learning loop before stale entered/expired picks.
      const needsLearningClose =
        thesisPlans.find(planNeedsStrategyReview) ??
        thesisPlans.find(planNeedsLearningSyncRepair);
      const primaryPlan =
        activePlans[0] ??
        needsLearningClose ??
        thesisPlans.find((p) => p.status === "entered") ??
        thesisPlans.find((p) => p.status === "expired") ??
        thesisPlans[0];
      const levelsView = buildPlanLevelsView(thesis, primaryPlan);
      const decisionPlan = thesisPlans.find((p) => p.decision) ?? primaryPlan;
      const verdict = resolveScoutingVerdict(thesis, decisionPlan);
      const linkedTrades = tradesForScoutCase({ thesis, thesisPlans, trades });
      const evaluation =
        primaryPlan ?? thesisPlans[0]
          ? evaluateScoutOperationalState({
              plan: (primaryPlan ?? thesisPlans[0]) as TradePlan,
              linkedTrades,
              reservations,
              now: new Date().toISOString(),
              minimumRR: thesis.riskRules?.minimumRR ?? 3,
            })
          : fallbackOperationalEvaluation();
      return {
        key: thesis.id,
        thesis,
        ticker: thesis.ticker,
        thesisPlans,
        primaryPlan,
        levelsView,
        plannedRR: resolveScoutCardPlannedRR(primaryPlan, levelsView),
        verdict,
        activeScoutCount: activePlans.length,
        linkedTrades,
        orphan: false,
        operational: evaluation,
      };
    });

    const orphanTickers = orphanIncompleteTradeTickers(trades, activeTheses);
    const orphans: ScoutCard[] = orphanTickers.map((ticker) => {
      const tickerPlans = plans.filter((p) => p.ticker.toUpperCase() === ticker);
      const primaryPlan = tickerPlans[0];
      const evaluation = primaryPlan
        ? evaluateScoutOperationalState({
            plan: primaryPlan,
            linkedTrades: incompleteTradesForTicker(trades, ticker),
            reservations,
            now: new Date().toISOString(),
            minimumRR: 3,
          })
        : fallbackOperationalEvaluation();
      return {
        key: `orphan:${ticker}`,
        thesis: null,
        ticker,
        thesisPlans: tickerPlans,
        primaryPlan,
        levelsView: null,
        plannedRR: resolveScoutCardPlannedRR(primaryPlan, null),
        verdict: null,
        activeScoutCount: tickerPlans.filter((p) => p.status === "watching" || p.status === "ready")
          .length,
        linkedTrades: incompleteTradesForTicker(trades, ticker),
        orphan: true,
        operational: evaluation,
      };
    });

    return [...fromTheses, ...orphans].sort((a, b) => {
      if (Boolean(a.orphan) !== Boolean(b.orphan)) return a.orphan ? 1 : -1;
      const cmp = compareScoutOperationalEvaluations(a.operational, b.operational);
      if (cmp !== 0) return cmp;
      return a.ticker.localeCompare(b.ticker);
    });
  }, [activeTheses, plans, trades, reservations]);

  const focusedScoutCard = useMemo(() => {
    const id = scoutCaseKey ?? focusThesisId ?? scoutCards[0]?.key ?? "";
    return scoutCards.find((card) => card.key === id) ?? scoutCards[0] ?? null;
  }, [scoutCards, scoutCaseKey, focusThesisId]);

  const scoutThesis = focusedScoutCard?.thesis ?? null;
  const scoutPrimaryPlan = focusedScoutCard?.primaryPlan ?? null;

  const learningQueue = useMemo(() => {
    const needsOutcome = plans.filter(planNeedsStrategyReview);
    const needsSync = plans.filter(planNeedsLearningSyncRepair);
    return { needsOutcome, needsSync };
  }, [plans]);

  const outcomePanelPlan = useMemo(() => {
    if (learningFocusPlanId) {
      const targeted = plans.find((p) => p.id === learningFocusPlanId);
      if (
        targeted &&
        (planNeedsStrategyReview(targeted) || planNeedsLearningSyncRepair(targeted))
      ) {
        return targeted;
      }
    }
    if (
      scoutPrimaryPlan &&
      (planNeedsStrategyReview(scoutPrimaryPlan) ||
        planNeedsLearningSyncRepair(scoutPrimaryPlan))
    ) {
      return scoutPrimaryPlan;
    }
    return null;
  }, [learningFocusPlanId, plans, scoutPrimaryPlan]);

  const focusPlan = useMemo(() => {
    if (focusPlanId) return plans.find((p) => p.id === focusPlanId) ?? scoutPrimaryPlan;
    return scoutPrimaryPlan;
  }, [plans, focusPlanId, scoutPrimaryPlan]);

  const selectedProspect: TradeProspect | null = useMemo(() => {
    if (!focusPlan) return null;
    return findTradeProspect(prospects, focusPlan.id) ?? null;
  }, [prospects, focusPlan]);

  const panelLevelsView = focusedScoutCard?.levelsView ?? null;

  const snapshotItems = useMemo(() => {
    const items = scoutDeskSnapshotItems({
      playbooks,
      stockTheses: activeTheses,
      plans,
      monthly,
      experiment,
      marketEvidence,
      focusThesis: scoutThesis ?? undefined,
      focusPlan: focusPlan ?? undefined,
    });
    if (focusPlan) {
      items.push(
        scoutFundingSnapshotItem({
          plan: focusPlan,
          // stockFileId omitted — StockThesis has no authoritative Stock File ID (26-40)
          reservations,
          account: capitalAccount,
          authorizableLossRoom: monthly.monthlyLossRoom,
          capitalConfigurationPresent,
        })
      );
    }
    return items;
  }, [
    scoutThesis,
    focusPlan,
    playbooks,
    activeTheses,
    plans,
    monthly,
    experiment,
    marketEvidence,
    reservations,
    capitalAccount,
    capitalConfigurationPresent,
  ]);

  useEffect(() => {
    if (!focusThesisId) return;
    setScoutCaseKey(focusThesisId);
  }, [focusThesisId]);

  useEffect(() => {
    if (!focusPlanId) return;
    const plan = plans.find((p) => p.id === focusPlanId);
    if (plan?.stockThesisId) {
      setScoutCaseKey(plan.stockThesisId);
    } else if (plan?.ticker) {
      setScoutCaseKey(`orphan:${plan.ticker.toUpperCase()}`);
    }
    if (
      plan &&
      (planNeedsStrategyReview(plan) || planNeedsLearningSyncRepair(plan))
    ) {
      setLearningFocusPlanId(focusPlanId);
    }
  }, [focusPlanId, plans]);

  const activeEvidence =
    scoutThesis != null
      ? marketEvidence.filter(
          (row) =>
            row.stockProfileId.toUpperCase() === scoutThesis.id.toUpperCase() && !row.supersededBy
        )
      : [];

  const hasCases = scoutCards.length > 0;

  const focusedRr = formatOperationalR(
    focusedScoutCard?.operational.detectedAssessment.currentExecutableRR
  );
  const mapFocusCompact = planPanelOpen;

  const allocationPlans = useMemo(
    () =>
      plans.filter(
        (p) =>
          p.status === "watching" ||
          p.status === "ready" ||
          p.status === "expired"
      ),
    [plans]
  );

  const plannedRRByPlanId = useMemo(() => {
    const map: Record<string, number | undefined> = {};
    for (const p of allocationPlans) {
      map[p.id] = resolvePlannedRRFromPlan(p);
    }
    return map;
  }, [allocationPlans]);

  function focusPlanFromAllocation(planId: string) {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    setLearningFocusPlanId(planId);
    if (plan.stockThesisId) {
      setScoutCaseKey(plan.stockThesisId);
      return;
    }
    if (plan.ticker) setScoutCaseKey(`orphan:${plan.ticker.toUpperCase()}`);
  }

  return (
    <ScoutAllocationProvider
      plans={allocationPlans}
      reservations={reservations}
      capitalAccount={capitalAccount}
      authorizableLossRoom={monthly.monthlyLossRoom}
      capitalConfigurationPresent={capitalConfigurationPresent}
      plannedRRByPlanId={plannedRRByPlanId}
    >
    <div
      className={`flex min-h-0 w-full flex-col lg:h-full lg:flex-row lg:overflow-hidden ${
        mapFocusCompact ? "max-lg:overflow-hidden" : ""
      }`}
      data-scout-desk
      data-scout-map-focus={mapFocusCompact ? "true" : undefined}
    >
      <div
        className={`min-h-0 min-w-0 overflow-y-auto overscroll-y-contain ${
          mapFocusCompact
            ? "hidden lg:flex lg:flex-1 lg:flex-col lg:pb-10"
            : "flex-1 pb-4 lg:pb-10"
        }`}
      >
        <header
          className={`border-b border-zinc-800 px-4 lg:px-6 ${
            mapFocusCompact ? "py-2 lg:py-3" : "py-3"
          }`}
        >
          <div className="flex items-start justify-between gap-3 pr-10">
            <div className="min-w-0">
              <h1
                className={`font-semibold text-zinc-100 ${
                  mapFocusCompact ? "text-base lg:text-xl" : "text-xl"
                }`}
              >
                Scout
              </h1>
              <p
                className={`mt-0.5 text-sm text-zinc-500 ${
                  mapFocusCompact ? "hidden lg:block" : ""
                }`}
              >
                Active cases and execution readiness
              </p>
            </div>
          </div>
          <div
            className={`mt-2 grid grid-cols-3 gap-1.5 sm:gap-2 ${
              mapFocusCompact ? "hidden lg:grid" : ""
            }`}
            data-scout-header-actions
          >
            <Link
              href="/stock-theses/new"
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-2 text-center text-[11px] font-medium leading-tight text-emerald-300 hover:bg-emerald-500/20 sm:px-3 sm:text-xs"
            >
              New stock case
            </Link>
            <Link
              href="/planning/capital"
              className="rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-2 text-center text-[11px] font-medium leading-tight text-zinc-200 hover:bg-zinc-800 sm:px-3 sm:text-xs"
            >
              Capital Planner
            </Link>
            <Link
              href="/planning/capital/allocation"
              className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-2 py-2 text-center text-[11px] font-medium leading-tight text-sky-200 hover:bg-sky-500/20 sm:px-3 sm:text-xs"
            >
              Allocation Board
            </Link>
          </div>
        </header>

        <div
          className={`px-4 lg:px-6 ${
            mapFocusCompact ? "space-y-2 py-1 lg:space-y-4 lg:py-4" : "space-y-4 py-4"
          }`}
        >
          {!hasCases ? (
            <section className="rounded-2xl border border-dashed border-zinc-700 px-4 py-10 text-center">
              <p className="text-sm text-zinc-500">No scout cases yet.</p>
              <Link
                href="/stock-theses/new"
                className="mt-3 inline-block text-sm text-violet-300 hover:underline"
              >
                New stock case →
              </Link>
            </section>
          ) : (
            <>
              {!mapFocusCompact &&
              (learningQueue.needsOutcome.length > 0 ||
                learningQueue.needsSync.length > 0) ? (
                <section
                  className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-3 py-3"
                  data-scout-learning-queue
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
                    Scout learning queue
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Close the circuit before new Scouts: record outcome, or Retry Learning
                    Sync when outcome already persisted.
                  </p>
                  {learningQueue.needsOutcome.length > 0 ? (
                    <ul className="mt-2 space-y-1" data-scout-needs-outcome>
                      {learningQueue.needsOutcome.map((plan) => (
                        <li key={plan.id}>
                          <button
                            type="button"
                            className="text-left text-xs text-amber-100 underline-offset-2 hover:underline"
                            onClick={() => focusPlanFromAllocation(plan.id)}
                          >
                            {plan.ticker} · {plan.id} · {plan.status} · needs outcome
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {learningQueue.needsSync.length > 0 ? (
                    <ul className="mt-2 space-y-1" data-scout-needs-sync-repair>
                      {learningQueue.needsSync.map((plan) => (
                        <li key={plan.id}>
                          <button
                            type="button"
                            className="text-left text-xs text-rose-200 underline-offset-2 hover:underline"
                            onClick={() => focusPlanFromAllocation(plan.id)}
                          >
                            {plan.ticker} · {plan.id} · sync{" "}
                            {plan.outcome?.learningSyncStatus ?? "pending"} · Retry Sync
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ) : null}
              {!mapFocusCompact ? (
                <details className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-300">
                    Compare active scouts
                  </summary>
                  <div className="mt-2">
                    <ActiveScoutsComparisonTable
                      plans={plans}
                      onFocusPlan={focusPlanFromAllocation}
                    />
                  </div>
                </details>
              ) : null}
              {!mapFocusCompact ? <ScoutAllocationStrip /> : null}
              <section
                className={`rounded-2xl border border-zinc-800 bg-zinc-900/50 ${
                  mapFocusCompact ? "p-2 lg:p-4" : "p-3"
                }`}
                data-scout-case-selector
              >
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="scout-case"
                    className={`text-xs font-medium text-zinc-500 ${
                      mapFocusCompact ? "sr-only lg:not-sr-only" : ""
                    }`}
                  >
                    Case
                  </label>
                  <select
                    id="scout-case"
                    value={focusedScoutCard?.key ?? ""}
                    onChange={(e) => setScoutCaseKey(e.target.value)}
                    className="min-w-[10rem] flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                  >
                    {scoutCards.map((card) => {
                      const op =
                        card.operational.confirmedAssessment ??
                        card.operational.detectedAssessment;
                      const displayOp =
                        card.primaryPlan?.executionReadiness === "armed"
                          ? { ...op, operationalState: "armed" as const, nextAction: "act" as const }
                          : op;
                      const rrLabel = formatOperationalR(displayOp.currentExecutableRR);
                      const tag = formatConsolidatedOperationalTag({
                        verdict: card.verdict,
                        assessment: displayOp,
                      });
                      const learningHint = card.thesisPlans.some(planNeedsStrategyReview)
                        ? " · needs outcome"
                        : card.thesisPlans.some(planNeedsLearningSyncRepair)
                          ? " · sync repair"
                          : card.primaryPlan && planNeedsStrategyReview(card.primaryPlan)
                            ? " · needs outcome"
                            : card.primaryPlan &&
                                planNeedsLearningSyncRepair(card.primaryPlan)
                              ? " · sync repair"
                              : "";
                      return (
                        <option key={card.key} value={card.key}>
                          {card.ticker}
                          {` · ${tag}`}
                          {` · ${rrLabel}`}
                          {card.orphan ? " · orphan fill" : ""}
                          {card.linkedTrades.length
                            ? ` · ${card.linkedTrades.length} open loop`
                            : ""}
                          {learningHint}
                          {card.primaryPlan ? ` · ${card.primaryPlan.id}` : ""}
                        </option>
                      );
                    })}
                  </select>
                  {panelLevelsView ? (
                    <PlanMapToggleButton
                      open={planPanelOpen}
                      onClick={() => setPlanPanelOpen((v) => !v)}
                      view={panelLevelsView}
                    />
                  ) : null}
                </div>
              </section>

              {focusedScoutCard?.orphan ? (
                <section
                  className={`rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 ${
                    mapFocusCompact ? "hidden lg:block" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-amber-100">{focusedScoutCard.ticker}</h2>
                    <span className="rounded-full border border-amber-400/40 px-2 py-0.5 text-xs font-bold uppercase text-amber-200">
                      Orphan fills
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-amber-100/80">
                    Incomplete fills without a stock file. Create a stock case to attach thesis + targets,
                    or open the fill and finish review to complete.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {focusedScoutCard.linkedTrades.map((t) => (
                      <li key={t.id} className="flex justify-between gap-3">
                        <Link href={`/trades/${t.id}`} className="text-violet-300 hover:underline">
                          {t.id} · {t.status}
                          {t.status === "closed" ? " · needs review" : ""}
                        </Link>
                        <span className="text-xs text-zinc-500">
                          entry {t.entry}
                          {t.target !== undefined ? ` → ${t.target}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/stock-theses/new"
                    className="mt-4 inline-block rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300"
                  >
                    New stock case for {focusedScoutCard.ticker}
                  </Link>
                </section>
              ) : null}

              {focusedScoutCard && !focusedScoutCard.orphan && focusedScoutCard.thesis ? (
                <section
                  className={`rounded-2xl border p-4 ${scoutingVerdictStyle(focusedScoutCard.verdict ?? "wait")} ${
                    mapFocusCompact ? "hidden lg:block" : ""
                  }`}
                  data-scout-case-summary
                >
                  {(() => {
                    const thesis = focusedScoutCard.thesis!;
                    const plan = focusedScoutCard.primaryPlan;
                    const le = plan?.layeredEntry;
                    const entry =
                      plan?.plannedEntry ?? le?.limits?.[0]?.price;
                    const stop =
                      plan?.stopPrice ?? le?.commonStopPrice;
                    const target =
                      plan?.targetPrice ?? le?.primaryTargetPrice;
                    const zone = formatStockThesisZone(thesis.levels?.primaryZone);
                    const rr = focusedScoutCard.plannedRR;
                    const operational = focusedScoutCard.operational.detectedAssessment;
                    const confirmedOperational =
                      focusedScoutCard.operational.confirmedAssessment;
                    const displayOperational =
                      plan?.executionReadiness === "armed"
                        ? {
                            ...(confirmedOperational ?? operational),
                            operationalState: "armed" as const,
                            nextAction: "act" as const,
                            waitHorizon: "now" as const,
                          }
                        : confirmedOperational ?? operational;
                    const fundingInput = plan
                      ? {
                          plan,
                          // stockFileId omitted — no authoritative Stock File ID (26-40)
                          reservations,
                          account: capitalAccount,
                          authorizableLossRoom: monthly.monthlyLossRoom,
                          capitalConfigurationPresent,
                        }
                      : null;
                    const fundingSnap = fundingInput
                      ? buildScoutFundingSnapshot(fundingInput)
                      : null;
                    const shares = fundingSnap
                      ? canonicalShareCount(fundingSnap.shareCount)
                      : undefined;
                    const fundingSnapshotForCase = fundingInput
                      ? scoutFundingSnapshotItem(fundingInput)
                      : null;

                    const snapshotItemsForCase = stockProfileSnapshotItems({
                      thesis,
                      playbooks,
                      plans,
                      activeEvidence,
                    }).filter((item) => item.id !== "mechanics");

                    async function prepareTrade() {
                      if (!plan || entry === undefined || stop === undefined) {
                        setPrepareMsg("Need entry + stop on the scout plan.");
                        return;
                      }
                      if (shares === undefined) {
                        setPrepareMsg(
                          "Share count unconfigured — calculate allocation first"
                        );
                        return;
                      }
                      const ok = await copyText(
                        buildTradeProposalBlock({
                          id: suggestedTradeId,
                          ticker: plan.ticker,
                          entry,
                          stop,
                          target,
                          shares,
                          playbookId: plan.playbookId,
                          thesis: `From plan ${plan.id}`,
                          direction: "long",
                        })
                      );
                      setPrepareMsg(
                        ok
                          ? "Copied trade-proposal — paste in Control → Apply"
                          : "Clipboard blocked"
                      );
                      setTimeout(() => setPrepareMsg(""), 2500);
                    }

                    async function prepareOperationalStatusUpdate(
                      phrase: string
                    ) {
                      if (!plan) {
                        setQuickOperationalError(
                          "No Scout Plan selected — cannot prepare status update."
                        );
                        setOperationalPreview(null);
                        setQuickOperationalMsg("");
                        setOperationalClipboardOk(null);
                        return;
                      }
                      const prepared = buildOperationalStatusPreview(plan, phrase);
                      if (!prepared.ok) {
                        setQuickOperationalError(prepared.error);
                        setOperationalPreview(null);
                        setQuickOperationalMsg("");
                        setOperationalClipboardOk(null);
                        return;
                      }
                      const json = prepared.preview.json;
                      setQuickOperationalError("");
                      setOperationalPreview(prepared.preview);
                      // Copy while still in the user-gesture async chain (mobile Safari).
                      const copied = await copyText(json);
                      setOperationalClipboardOk(copied);
                      stashControlApplyDraft(json);
                      openPanel({ step: "apply", applyJson: json });
                      if (copied) {
                        setQuickOperationalMsg(
                          "JSON copied — Control → Apply opened. Validate → Accept."
                        );
                      } else {
                        setQuickOperationalMsg("");
                        setQuickOperationalError(
                          "Clipboard blocked — JSON is ready below and loaded in Apply. Use Copy JSON if needed, then Validate → Accept."
                        );
                      }
                    }

                    async function copyOperationalJsonAgain() {
                      if (!operationalPreview?.json) return;
                      const copied = await copyText(operationalPreview.json);
                      setOperationalClipboardOk(copied);
                      if (copied) {
                        setQuickOperationalError("");
                        setQuickOperationalMsg("JSON copied to clipboard.");
                      } else {
                        setQuickOperationalMsg("");
                        setQuickOperationalError(
                          "Clipboard still blocked — select the JSON below and copy manually, or use the JSON already loaded in Apply."
                        );
                      }
                    }

                    function openOperationalApply() {
                      if (!operationalPreview?.json) return;
                      stashControlApplyDraft(operationalPreview.json);
                      openPanel({
                        step: "apply",
                        applyJson: operationalPreview.json,
                      });
                    }

                    return (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xl font-semibold">
                            {thesis.ticker}
                          </span>
                          <span className="text-xs opacity-70">{thesis.id}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                              thesisStatusStyles[thesis.status] ??
                              "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {STOCK_THESIS_STATUS_LABELS[thesis.status]}
                          </span>
                          <span
                            className="rounded-full border border-current/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                            data-scout-operational-tag
                          >
                            {formatConsolidatedOperationalTag({
                              verdict: focusedScoutCard.verdict,
                              assessment: displayOperational,
                            })}
                          </span>
                        </div>

                        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                          {(
                            [
                              ["Zone", zone],
                              [
                                "Entry",
                                entry !== undefined ? String(entry) : "—",
                              ],
                              [
                                "Stop",
                                stop !== undefined ? String(stop) : "—",
                              ],
                              [
                                "Target",
                                target !== undefined ? String(target) : "—",
                              ],
                              [
                                "Plan R:R",
                                rr !== undefined ? `${rr.toFixed(1)}R` : "—",
                              ],
                              [
                                "Executable R",
                                formatOperationalR(
                                  displayOperational.currentExecutableRR
                                ),
                              ],
                              [
                                "Wait Horizon",
                                displayOperational.waitHorizon,
                              ],
                              [
                                "Room",
                                `$${monthly.monthlyLossRoom.toFixed(0)}`,
                              ],
                              [
                                "Execution readiness",
                                plan?.executionReadiness ?? "—",
                              ],
                            ] as const
                          ).map(([label, value]) => (
                            <div
                              key={label}
                              className="rounded-lg border border-current/15 bg-black/10 px-2.5 py-1.5"
                            >
                              <dt className="text-[10px] uppercase tracking-wide opacity-60">
                                {label}
                              </dt>
                              <dd className="mt-0.5 text-sm font-medium tabular-nums">
                                {value}
                              </dd>
                            </div>
                          ))}
                        </dl>

                        <ScoutAllocationImpact
                          planId={plan?.id}
                          onFocusPlan={focusPlanFromAllocation}
                        />

                        {focusedScoutCard.operational.mismatch ? (
                          <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-xs text-amber-100">
                            Detected:{" "}
                            {formatOperationalStateLabel(
                              operational.operationalState
                            )}{" "}
                            · Confirmed:{" "}
                            {confirmedOperational
                              ? formatOperationalStateLabel(
                                  confirmedOperational.operationalState
                                )
                              : "none"}{" "}
                            · Review required
                          </div>
                        ) : null}

                        {plan ? (
                          <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                              Update operational state
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {SCOUT_OPERATIONAL_STATUS_ACTIONS.map((phrase) => (
                                <button
                                  key={phrase}
                                  type="button"
                                  data-scout-operational-preset
                                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-zinc-900"
                                  onClick={() => {
                                    setQuickOperationalPhrase(phrase);
                                    void prepareOperationalStatusUpdate(phrase);
                                  }}
                                >
                                  {phrase}
                                </button>
                              ))}
                            </div>
                            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                              <input
                                value={quickOperationalPhrase}
                                onChange={(e) =>
                                  setQuickOperationalPhrase(e.target.value)
                                }
                                placeholder="Passed / Review 1D / Review 1W / Reanalyze / Unlikely / Armed"
                                className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200"
                                data-scout-operational-phrase-input
                              />
                              <button
                                type="button"
                                data-scout-prepare-status-update
                                className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-200 hover:bg-sky-500/20"
                                onClick={() =>
                                  void prepareOperationalStatusUpdate(
                                    quickOperationalPhrase
                                  )
                                }
                              >
                                Prepare status update
                              </button>
                            </div>
                            {quickOperationalError ? (
                              <p
                                className="mt-2 text-xs text-red-300"
                                data-scout-operational-error
                                role="alert"
                              >
                                {quickOperationalError}
                              </p>
                            ) : null}
                            {quickOperationalMsg ? (
                              <p
                                className="mt-2 text-xs text-emerald-300/90"
                                data-scout-operational-success
                              >
                                {quickOperationalMsg}
                              </p>
                            ) : null}
                            {operationalPreview ? (
                              <div
                                className="mt-3 space-y-2 rounded-lg border border-zinc-800 bg-black/30 p-3"
                                data-scout-operational-preview
                              >
                                <p className="text-xs font-medium text-zinc-200">
                                  Action: {operationalPreview.action}
                                </p>
                                <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                                  Changes
                                </p>
                                {operationalPreview.changes.length === 0 ? (
                                  <p className="text-xs text-zinc-500">
                                    No field changes vs current persisted values.
                                  </p>
                                ) : (
                                  <ul className="space-y-1 text-xs text-zinc-300">
                                    {operationalPreview.changes.map((change) => (
                                      <li key={change.field}>
                                        <span className="font-mono text-zinc-400">
                                          {change.field}
                                        </span>
                                        : {String(change.from)} →{" "}
                                        {String(change.to)}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                                  Generated JSON
                                </p>
                                <pre
                                  className="max-h-48 overflow-auto rounded-md border border-zinc-800 bg-zinc-950 p-2 text-[10px] leading-relaxed text-zinc-300"
                                  data-scout-operational-json
                                >
                                  {operationalPreview.json}
                                </pre>
                                <div className="flex flex-wrap gap-2">
                                  {operationalClipboardOk === false ? (
                                    <button
                                      type="button"
                                      data-scout-operational-copy-json
                                      className="inline-flex rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/20"
                                      onClick={() => void copyOperationalJsonAgain()}
                                    >
                                      Copy JSON
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    data-scout-operational-apply-link
                                    className="inline-flex rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-500/20"
                                    onClick={openOperationalApply}
                                  >
                                    Open Apply
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link
                            href={`/stock-theses/${thesis.id}`}
                            className="rounded-lg border border-current/30 px-3 py-2 text-xs font-medium opacity-90 hover:opacity-100"
                          >
                            Open Scout
                          </Link>
                          <SnapshotButton
                            title={snapshotButtonTitle(thesis.ticker, "snapshot")}
                            description="Profile + evidence + scout"
                            className="!px-3 !py-2"
                            items={
                              snapshotItemsForCase.length > 0
                                ? snapshotItemsForCase
                                : snapshotItems.length > 0
                                  ? snapshotItems
                                  : initialSnapshotItems
                            }
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setDetailsOpen(true);
                              setDetailsSection(null);
                            }}
                            className="rounded-lg border border-current/30 px-3 py-2 text-xs font-medium opacity-90 hover:opacity-100"
                          >
                            Details
                          </button>
                        </div>

                        <ScoutFundingExecutionMenu
                          fundingSnapshotItem={fundingSnapshotForCase}
                          prepareTrade={() => void prepareTrade()}
                          prepareDisabled={shares === undefined}
                          prepareLabel={
                            shares === undefined
                              ? "Prepare trade · allocation required"
                              : "Prepare trade"
                          }
                          blockers={[
                            ...(shares === undefined
                              ? ["Share count unconfigured"]
                              : []),
                            ...(shares === undefined
                              ? ["Allocation required"]
                              : []),
                            ...(fundingSnap &&
                            fundingSnap.currentFundingDecision !==
                              "unconfigured" &&
                            fundingSnap.currentFundingDecision !== "unknown"
                              ? [
                                  String(fundingSnap.currentFundingDecision)
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (c) => c.toUpperCase()),
                                ]
                              : []),
                            ...(fundingSnap?.blockingReasons?.some((r) =>
                              r.toLowerCase().includes("reservation")
                            )
                              ? ["Reservation required"]
                              : []),
                          ].filter((v, i, a) => a.indexOf(v) === i)}
                        />
                        {shares === undefined || prepareMsg ? (
                          <ScoutPrepareAllocationNote
                            hasCanonicalShares={shares !== undefined}
                            prepareMsg={prepareMsg}
                            linksInNote={false}
                          />
                        ) : null}

                        <div
                          className="mt-3 border-t border-current/15 pt-2"
                          data-scout-case-details
                        >
                          <button
                            type="button"
                            onClick={() => setDetailsOpen((v) => !v)}
                            className="flex w-full items-center justify-between gap-2 py-1.5 text-left text-xs font-medium opacity-80 hover:opacity-100"
                            aria-expanded={detailsOpen}
                          >
                            <span>
                              Details
                              <span className="ml-2 font-normal opacity-60">
                                Thesis, invalidation, fills, evidence
                              </span>
                            </span>
                            <span>{detailsOpen ? "▾" : "▸"}</span>
                          </button>
                          {detailsOpen ? (
                            <div className="mt-2 space-y-2">
                              {(
                                [
                                  {
                                    id: "thesis" as const,
                                    title: "Thesis",
                                    blurb: "Market structure and scenario.",
                                    body: (
                                      <div className="space-y-2 text-sm opacity-90">
                                        {thesis.currentHypothesis ? (
                                          <p>{thesis.currentHypothesis}</p>
                                        ) : null}
                                        {thesis.thesis ? (
                                          <p className="text-xs opacity-70">
                                            {thesis.thesis}
                                          </p>
                                        ) : (
                                          <p className="text-xs opacity-60">
                                            No extended thesis.
                                          </p>
                                        )}
                                      </div>
                                    ),
                                  },
                                  {
                                    id: "invalidation" as const,
                                    title: "Invalidation",
                                    blurb: "Conditions that void the plan.",
                                    body: (
                                      <p className="text-sm opacity-90">
                                        {thesis.riskRules.invalidation ||
                                          "Unconfigured"}
                                      </p>
                                    ),
                                  },
                                  {
                                    id: "fills" as const,
                                    title: "Fills in war room",
                                    blurb: "Open-loop fills and re-entries.",
                                    body:
                                      focusedScoutCard.linkedTrades.length ===
                                      0 ? (
                                        <p className="text-xs opacity-70">
                                          No open-loop fills for this ticker.
                                        </p>
                                      ) : (
                                        <ul className="space-y-1 text-xs">
                                          {focusedScoutCard.linkedTrades.map(
                                            (t) => (
                                              <li
                                                key={t.id}
                                                className="flex flex-wrap justify-between gap-2"
                                              >
                                                <Link
                                                  href={`/trades/${t.id}`}
                                                  className="underline opacity-90 hover:opacity-100"
                                                >
                                                  {t.id} · {t.status}
                                                  {t.status === "closed"
                                                    ? " · review pending"
                                                    : ""}
                                                </Link>
                                                <span className="opacity-70">
                                                  {t.entry}
                                                  {t.target !== undefined
                                                    ? ` → ${t.target}`
                                                    : ""}
                                                </span>
                                              </li>
                                            )
                                          )}
                                        </ul>
                                      ),
                                  },
                                  {
                                    id: "evidence" as const,
                                    title: "Evidence",
                                    blurb: "Charts, notes and references.",
                                    body: (
                                      <div className="space-y-1 text-xs opacity-80">
                                        {activeEvidence.length === 0 ? (
                                          <p>No active evidence linked.</p>
                                        ) : (
                                          <ul className="space-y-1">
                                            {activeEvidence
                                              .slice(0, 8)
                                              .map((ev) => (
                                                <li key={ev.id}>
                                                  {ev.category}
                                                  {ev.value
                                                    ? ` · ${ev.value.slice(0, 80)}`
                                                    : ""}
                                                </li>
                                              ))}
                                          </ul>
                                        )}
                                        {focusedScoutCard.levelsView ? (
                                          <p className="pt-1 opacity-70">
                                            <PlanMapSummaryLine
                                              view={focusedScoutCard.levelsView}
                                            />
                                          </p>
                                        ) : null}
                                      </div>
                                    ),
                                  },
                                ] as const
                              ).map((row) => {
                                const open = detailsSection === row.id;
                                return (
                                  <div
                                    key={row.id}
                                    className="rounded-lg border border-current/15 bg-black/10"
                                  >
                                    <button
                                      type="button"
                                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                                      onClick={() =>
                                        setDetailsSection(open ? null : row.id)
                                      }
                                      aria-expanded={open}
                                    >
                                      <div>
                                        <p className="text-xs font-medium">
                                          {row.title}
                                        </p>
                                        <p className="text-[11px] opacity-60">
                                          {row.blurb}
                                        </p>
                                      </div>
                                      <span className="text-xs opacity-50">
                                        {open ? "▾" : "▸"}
                                      </span>
                                    </button>
                                    {open ? (
                                      <div className="border-t border-current/10 px-3 py-2">
                                        {row.body}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      </>
                    );
                  })()}
                </section>
              ) : null}

              {outcomePanelPlan && !mapFocusCompact ? (
                <div className="mt-4" data-scout-outcome-panel>
                  <PlanRecordOutcomePanel plan={outcomePanelPlan} />
                </div>
              ) : null}

              {!focusedScoutCard?.orphan ? (
                <div className={mapFocusCompact ? "hidden lg:block" : undefined}>
                  <ScoutExecutePanel
                    key={focusPlan?.id ?? scoutThesis?.id ?? "execute"}
                    plan={focusPlan}
                    prospect={selectedProspect}
                    prospects={prospects}
                    playbooks={playbooks}
                    suggestedTradeId={suggestedTradeId}
                    monthlyLossRoom={monthly.monthlyLossRoom}
                    reservations={reservations}
                    capitalAccount={capitalAccount}
                    capitalConfigurationPresent={capitalConfigurationPresent}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <PlanLevelsSidePanel
        view={panelLevelsView}
        open={planPanelOpen}
        onClose={() => setPlanPanelOpen(false)}
        subtitle={
          focusPlan
            ? `${focusPlan.id} · scout window`
            : scoutThesis
              ? `${scoutThesis.id} · profile levels`
              : undefined
        }
      />
    </div>
    </ScoutAllocationProvider>
  );
}
