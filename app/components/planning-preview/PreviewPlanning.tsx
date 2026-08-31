"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ScoutExecutePanel } from "@/app/components/planning-preview/ScoutExecutePanel";
import { PlanRecordOutcomePanel } from "@/app/components/planning-preview/PlanRecordOutcomePanel";
import { ScoutWatchingScan } from "@/app/components/planning-preview/ScoutWatchingScan";
import { buildPlanLevelsView } from "@/lib/plan-levels-board";
import {
  isWarReadyScoutPlan,
  planNeedsLearningSyncRepair,
  planNeedsStrategyReview,
} from "@/lib/plan-helpers";
import type { MonthlyRisk } from "@/lib/monthly-risk";
import type { TradePlan } from "@/lib/plan-types";
import type { Playbook } from "@/lib/playbook-types";
import {
  resolveScoutingVerdict,
  type ScoutingVerdict,
} from "@/lib/scouting-types";
import {
  isActiveStockThesisStatus,
  type StockThesis,
} from "@/lib/stock-thesis-types";
import {
  PlanLevelsSidePanel,
  PlanMapToggleButton,
} from "./PlanLevelsSidePanel";
import type { Trade } from "@/lib/types";
import type { CapitalAccountSnapshot } from "@/lib/capital-account";
import type { CapitalReservation } from "@/lib/capital-types";
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
  type ScoutOperationalEvaluation,
} from "@/lib/scout-operational-state";
import { listScoutWarCases } from "@/lib/scout-war-cases";
import { resolvePlannedRRFromPlan } from "@/lib/plan-risk";
import {
  buildTradeProspects,
  findTradeProspect,
  type TradeProspect,
} from "@/lib/trade-prospects";
import { ActiveScoutsComparisonTable } from "@/app/components/planning-preview/ActiveScoutsComparisonTable";
import { ScoutAllocationProvider } from "@/app/components/planning-preview/ScoutAllocationProvider";
import { ScoutAllocationStrip } from "@/app/components/planning-preview/ScoutAllocationStrip";

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
  monthly,
  trades,
  suggestedTradeId,
  focusPlanId,
  focusThesisId,
  reservations = [],
  capitalAccount = null,
  capitalConfigurationPresent,
}: {
  plans: TradePlan[];
  playbooks: Playbook[];
  stockTheses: StockThesis[];
  monthly: MonthlyRisk;
  trades: Trade[];
  suggestedTradeId: string;
  focusPlanId?: string;
  focusThesisId?: string;
  reservations?: CapitalReservation[];
  capitalAccount?: CapitalAccountSnapshot | null;
  capitalConfigurationPresent?: boolean;
}) {
  const [scoutCaseKey, setScoutCaseKey] = useState<string | null>(
    focusPlanId ?? focusThesisId ?? null
  );
  /** Deep-link focus for Record Outcome / Retry Sync (ATTN → /planning?plan=). */
  const [learningFocusPlanId, setLearningFocusPlanId] = useState<string | null>(null);
  const [planPanelOpen, setPlanPanelOpen] = useState(false);

  const activeTheses = useMemo(
    () => stockTheses.filter((t) => isActiveStockThesisStatus(t.status)),
    [stockTheses]
  );

  const prospects = useMemo(() => buildTradeProspects(plans), [plans]);

  const scoutCards = useMemo((): ScoutCard[] => {
    // One Case per war-ready plan (same universe as Dashboard active_plans).
    // Multiple plans on one Stock File / ticker are independent tactical windows.
    const fromWar = listScoutWarCases(plans, stockTheses).map((ref): ScoutCard => {
      const { thesis, plan: primaryPlan } = ref;
      const thesisPlans = plans.filter((p) => p.stockThesisId === thesis.id);
      const levelsView = buildPlanLevelsView(thesis, primaryPlan);
      const verdict = resolveScoutingVerdict(thesis, primaryPlan);
      const linkedTrades = tradesForScoutCase({
        thesis,
        thesisPlans: [primaryPlan],
        trades,
      });
      const evaluation = evaluateScoutOperationalState({
        plan: primaryPlan,
        linkedTrades,
        reservations,
        now: new Date().toISOString(),
        minimumRR: thesis.riskRules?.minimumRR ?? 3,
      });
      return {
        key: ref.key,
        thesis,
        ticker: thesis.ticker,
        thesisPlans,
        primaryPlan,
        levelsView,
        plannedRR: resolveScoutCardPlannedRR(primaryPlan, levelsView),
        verdict,
        activeScoutCount: 1,
        linkedTrades,
        orphan: false,
        operational: evaluation,
      };
    });

    const orphanTickers = orphanIncompleteTradeTickers(trades, activeTheses);
    const orphans: ScoutCard[] = orphanTickers.map((ticker) => {
      const tickerPlans = plans.filter((p) => p.ticker.toUpperCase() === ticker);
      const warPlans = tickerPlans.filter(isWarReadyScoutPlan);
      const primaryPlan = warPlans[0];
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
        activeScoutCount: warPlans.length,
        linkedTrades: incompleteTradesForTicker(trades, ticker),
        orphan: true,
        operational: evaluation,
      };
    });

    return [...fromWar, ...orphans].sort((a, b) => {
      if (Boolean(a.orphan) !== Boolean(b.orphan)) return a.orphan ? 1 : -1;
      const cmp = compareScoutOperationalEvaluations(a.operational, b.operational);
      if (cmp !== 0) return cmp;
      const tickerCmp = a.ticker.localeCompare(b.ticker);
      if (tickerCmp !== 0) return tickerCmp;
      return (a.primaryPlan?.id ?? a.key).localeCompare(b.primaryPlan?.id ?? b.key);
    });
  }, [activeTheses, plans, stockTheses, trades, reservations]);

  const focusedScoutCard = useMemo(() => {
    if (scoutCaseKey) {
      const byKey = scoutCards.find((card) => card.key === scoutCaseKey);
      if (byKey) return byKey;
      // Legacy deep-link: thesis id selected the collapsed Case; pick first plan for that file.
      const byThesis = scoutCards.find((card) => card.thesis?.id === scoutCaseKey);
      if (byThesis) return byThesis;
    }
    if (focusPlanId) {
      const byPlan = scoutCards.find(
        (card) => card.key === focusPlanId || card.primaryPlan?.id === focusPlanId
      );
      if (byPlan) return byPlan;
    }
    if (focusThesisId) {
      const byThesis = scoutCards.find((card) => card.thesis?.id === focusThesisId);
      if (byThesis) return byThesis;
    }
    return scoutCards[0] ?? null;
  }, [scoutCards, scoutCaseKey, focusPlanId, focusThesisId]);

  const scoutThesis = focusedScoutCard?.thesis ?? null;
  const scoutPrimaryPlan = focusedScoutCard?.primaryPlan ?? null;

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
    // Case selector is the source of truth; URL ?plan= only seeds scoutCaseKey.
    if (scoutPrimaryPlan) return scoutPrimaryPlan;
    if (focusPlanId) return plans.find((p) => p.id === focusPlanId) ?? null;
    return null;
  }, [plans, focusPlanId, scoutPrimaryPlan]);

  const selectedProspect: TradeProspect | null = useMemo(() => {
    if (!focusPlan) return null;
    return findTradeProspect(prospects, focusPlan.id) ?? null;
  }, [prospects, focusPlan]);

  const panelLevelsView = focusedScoutCard?.levelsView ?? null;

  useEffect(() => {
    if (!focusThesisId) return;
    setScoutCaseKey((prev) => {
      if (prev) {
        // Keep an explicit plan selection under this thesis.
        const card = scoutCards.find((c) => c.key === prev);
        if (card?.thesis?.id === focusThesisId) return prev;
        if (prev === focusThesisId) return prev;
      }
      return focusThesisId;
    });
  }, [focusThesisId, scoutCards]);

  useEffect(() => {
    if (!focusPlanId) return;
    const plan = plans.find((p) => p.id === focusPlanId);
    setScoutCaseKey(focusPlanId);
    if (
      plan &&
      (planNeedsStrategyReview(plan) || planNeedsLearningSyncRepair(plan))
    ) {
      setLearningFocusPlanId(focusPlanId);
    }
  }, [focusPlanId, plans]);

  const hasCases = scoutCards.length > 0;
  const mapFocusCompact = planPanelOpen;

  const allocationPlans = useMemo(
    () => plans.filter(isWarReadyScoutPlan),
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
    setLearningFocusPlanId(planId);
    setScoutCaseKey(planId);
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
              href="/mxt/stock-theses/new"
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-2 text-center text-[11px] font-medium leading-tight text-emerald-300 hover:bg-emerald-500/20 sm:px-3 sm:text-xs"
            >
              New stock case
            </Link>
            <Link
              href="/mxt/scout/capital"
              className="rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-2 text-center text-[11px] font-medium leading-tight text-zinc-200 hover:bg-zinc-800 sm:px-3 sm:text-xs"
            >
              Capital Planner
            </Link>
            <Link
              href="/mxt/scout/capital/allocation"
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
                href="/mxt/stock-theses/new"
                className="mt-3 inline-block text-sm text-violet-300 hover:underline"
              >
                New stock case →
              </Link>
            </section>
          ) : (
            <>
              {!mapFocusCompact ? (
                <details className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-300">
                    Compare active scouts
                  </summary>
                  <div className="mt-2">
                    <ActiveScoutsComparisonTable
                      plans={allocationPlans}
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
                      return (
                        <option key={card.key} value={card.key}>
                          {card.ticker}
                          {` · ${tag}`}
                          {` · ${rrLabel}`}
                          {card.orphan ? " · orphan fill" : ""}
                          {card.linkedTrades.length
                            ? ` · ${card.linkedTrades.length} open loop`
                            : ""}
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
                        <Link href={`/mxt/trades/${t.id}`} className="text-violet-300 hover:underline">
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
                    href="/mxt/stock-theses/new"
                    className="mt-4 inline-block rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300"
                  >
                    New stock case for {focusedScoutCard.ticker}
                  </Link>
                </section>
              ) : null}

              {focusedScoutCard && !focusedScoutCard.orphan && focusedScoutCard.thesis ? (
                <div className={mapFocusCompact ? "hidden lg:block" : undefined}>
                  {(() => {
                    const plan = focusedScoutCard.primaryPlan;
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
                    return (
                      <ScoutWatchingScan
                        thesis={focusedScoutCard.thesis}
                        plan={plan}
                        verdict={focusedScoutCard.verdict}
                        plannedRR={focusedScoutCard.plannedRR}
                        displayOperational={displayOperational}
                        mismatch={focusedScoutCard.operational.mismatch}
                        detectedStateLabel={formatOperationalStateLabel(
                          operational.operationalState
                        )}
                        confirmedStateLabel={
                          confirmedOperational
                            ? formatOperationalStateLabel(
                                confirmedOperational.operationalState
                              )
                            : undefined
                        }
                      />
                    );
                  })()}
                </div>
              ) : null}

              {outcomePanelPlan && !mapFocusCompact ? (
                <div className="mt-4 space-y-2" data-scout-outcome-panel>
                  <PlanRecordOutcomePanel plan={outcomePanelPlan} />
                  <Link
                    href={`/mxt/scout/case?plan=${encodeURIComponent(outcomePanelPlan.id)}`}
                    className="inline-block text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Case review (Blind / Reveal)
                  </Link>
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
