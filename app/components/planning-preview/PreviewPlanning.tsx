"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SnapshotButton } from "@/app/components/preview/SnapshotButton";
import { ScoutExecutePanel } from "@/app/components/planning-preview/ScoutExecutePanel";
import { buildPlanLevelsView } from "@/lib/plan-levels-board";
import { scoutingVerdictStyle } from "@/lib/matrix-mechanics-brief";
import type { MarketEvidence } from "@/lib/market-evidence-types";
import type { MonthlyRisk } from "@/lib/monthly-risk";
import type { TradePlan } from "@/lib/plan-types";
import type { Playbook } from "@/lib/playbook-types";
import {
  resolveScoutingVerdict,
  SCOUTING_VERDICT_LABELS,
  type ScoutingVerdict,
} from "@/lib/scouting-types";
import {
  isActiveStockThesisStatus,
  STOCK_THESIS_STATUS_LABELS,
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
import {
  incompleteTradesForTicker,
  orphanIncompleteTradeTickers,
  tradesForScoutCase,
} from "@/lib/scout-case-trades";
import {
  buildTradeProspects,
  findTradeProspect,
  type TradeProspect,
} from "@/lib/trade-prospects";

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
  verdict: ScoutingVerdict | null;
  activeScoutCount: number;
  linkedTrades: Trade[];
  orphan: boolean;
};

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
}) {
  const [scoutCaseKey, setScoutCaseKey] = useState<string | null>(focusThesisId ?? null);
  const [planPanelOpen, setPlanPanelOpen] = useState(false);

  const activeTheses = useMemo(
    () => stockTheses.filter((t) => isActiveStockThesisStatus(t.status)),
    [stockTheses]
  );

  const prospects = useMemo(() => buildTradeProspects(plans), [plans]);

  const scoutCards = useMemo((): ScoutCard[] => {
    const fromTheses: ScoutCard[] = activeTheses.map((thesis) => {
      const thesisPlans = plans.filter((p) => p.stockThesisId === thesis.id);
      const activePlans = thesisPlans.filter((p) => p.status === "watching" || p.status === "ready");
      // Prefer live plan; expired still usable (revive via Control) if no active
      const primaryPlan =
        activePlans[0] ??
        thesisPlans.find((p) => p.status === "entered") ??
        thesisPlans.find((p) => p.status === "expired") ??
        thesisPlans[0];
      const levelsView = buildPlanLevelsView(thesis, primaryPlan);
      const decisionPlan = thesisPlans.find((p) => p.decision) ?? primaryPlan;
      const verdict = resolveScoutingVerdict(thesis, decisionPlan);
      const linkedTrades = tradesForScoutCase({ thesis, thesisPlans, trades });
      return {
        key: thesis.id,
        thesis,
        ticker: thesis.ticker,
        thesisPlans,
        primaryPlan,
        levelsView,
        verdict,
        activeScoutCount: activePlans.length,
        linkedTrades,
        orphan: false,
      };
    });

    const orphanTickers = orphanIncompleteTradeTickers(trades, activeTheses);
    const orphans: ScoutCard[] = orphanTickers.map((ticker) => {
      const tickerPlans = plans.filter((p) => p.ticker.toUpperCase() === ticker);
      const primaryPlan = tickerPlans[0];
      return {
        key: `orphan:${ticker}`,
        thesis: null,
        ticker,
        thesisPlans: tickerPlans,
        primaryPlan,
        levelsView: null,
        verdict: null,
        activeScoutCount: tickerPlans.filter((p) => p.status === "watching" || p.status === "ready")
          .length,
        linkedTrades: incompleteTradesForTicker(trades, ticker),
        orphan: true,
      };
    });

    return [...fromTheses, ...orphans];
  }, [activeTheses, plans, trades]);

  const focusedScoutCard = useMemo(() => {
    const id = scoutCaseKey ?? focusThesisId ?? scoutCards[0]?.key ?? "";
    return scoutCards.find((card) => card.key === id) ?? scoutCards[0] ?? null;
  }, [scoutCards, scoutCaseKey, focusThesisId]);

  const scoutThesis = focusedScoutCard?.thesis ?? null;
  const scoutPrimaryPlan = focusedScoutCard?.primaryPlan ?? null;

  const focusPlan = useMemo(() => {
    if (focusPlanId) return plans.find((p) => p.id === focusPlanId) ?? scoutPrimaryPlan;
    return scoutPrimaryPlan;
  }, [plans, focusPlanId, scoutPrimaryPlan]);

  const selectedProspect: TradeProspect | null = useMemo(() => {
    if (!focusPlan) return null;
    return findTradeProspect(prospects, focusPlan.id) ?? null;
  }, [prospects, focusPlan]);

  const panelLevelsView = focusedScoutCard?.levelsView ?? null;

  const snapshotTitle = useMemo(() => {
    if (focusPlan) return snapshotButtonTitle(focusPlan.ticker, `${focusPlan.id} snapshot`);
    if (scoutThesis) return snapshotButtonTitle(scoutThesis.ticker, "snapshot");
    return "Scout snapshot";
  }, [scoutThesis, focusPlan]);

  const snapshotItems = useMemo(() => {
    return scoutDeskSnapshotItems({
      playbooks,
      stockTheses: activeTheses,
      plans,
      monthly,
      experiment,
      marketEvidence,
      focusThesis: scoutThesis ?? undefined,
      focusPlan: focusPlan ?? undefined,
    });
  }, [
    scoutThesis,
    focusPlan,
    plans,
    playbooks,
    activeTheses,
    monthly,
    experiment,
    marketEvidence,
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
      return;
    }
    if (plan?.ticker) setScoutCaseKey(`orphan:${plan.ticker.toUpperCase()}`);
  }, [focusPlanId, plans]);

  const activeEvidence =
    scoutThesis != null
      ? marketEvidence.filter(
          (row) =>
            row.stockProfileId.toUpperCase() === scoutThesis.id.toUpperCase() && !row.supersededBy
        )
      : [];

  const hasCases = scoutCards.length > 0;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden lg:flex-row">
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain pb-10">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">Scout</h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                War room — fills stay until completados (closed + review). Closed alone is not enough.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:mr-[11rem]">
              <Link
                href="/stock-theses/new"
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20"
              >
                New stock case
              </Link>
              <SnapshotButton
                title={snapshotTitle}
                description="Focused scout / ticker / desk"
                items={snapshotItems.length > 0 ? snapshotItems : initialSnapshotItems}
              />
            </div>
          </div>
        </header>

        <div className="space-y-4 px-4 py-4 lg:px-6">
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
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="scout-case" className="text-xs font-medium text-zinc-500">
                    Case
                  </label>
                  <select
                    id="scout-case"
                    value={focusedScoutCard?.key ?? ""}
                    onChange={(e) => setScoutCaseKey(e.target.value)}
                    className="min-w-[14rem] flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                  >
                    {scoutCards.map((card) => (
                      <option key={card.key} value={card.key}>
                        {card.ticker}
                        {card.orphan ? " · orphan fill" : ""}
                        {card.verdict ? ` · ${SCOUTING_VERDICT_LABELS[card.verdict]}` : ""}
                        {card.linkedTrades.length
                          ? ` · ${card.linkedTrades.length} open loop`
                          : ""}
                        {card.primaryPlan ? ` · ${card.primaryPlan.id}` : ""}
                      </option>
                    ))}
                  </select>
                  {panelLevelsView ? (
                    <PlanMapToggleButton
                      open={planPanelOpen}
                      onClick={() => setPlanPanelOpen((v) => !v)}
                      view={panelLevelsView}
                    />
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {scoutCards.map((card) => {
                    const selected = card.key === focusedScoutCard?.key;
                    return (
                      <button
                        key={card.key}
                        type="button"
                        onClick={() => setScoutCaseKey(card.key)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          selected
                            ? "bg-violet-600 text-white"
                            : "border border-zinc-700 text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {card.ticker}
                        {card.linkedTrades.length > 0 ? ` ·${card.linkedTrades.length}` : ""}
                      </button>
                    );
                  })}
                </div>
              </section>

              {focusedScoutCard?.orphan ? (
                <section className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5">
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
                  className={`rounded-2xl border p-5 ${scoutingVerdictStyle(focusedScoutCard.verdict ?? "wait")}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/stock-theses/${focusedScoutCard.thesis.id}`}
                      className="text-xl font-semibold hover:underline"
                    >
                      {focusedScoutCard.thesis.ticker}
                    </Link>
                    <span className="text-xs opacity-70">{focusedScoutCard.thesis.id}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                        thesisStatusStyles[focusedScoutCard.thesis.status] ?? "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {STOCK_THESIS_STATUS_LABELS[focusedScoutCard.thesis.status]}
                    </span>
                    {focusedScoutCard.verdict ? (
                      <span className="rounded-full border border-current px-2 py-0.5 text-xs font-bold uppercase">
                        {SCOUTING_VERDICT_LABELS[focusedScoutCard.verdict]}
                      </span>
                    ) : null}
                    {focusedScoutCard.primaryPlan?.status === "expired" ? (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold uppercase text-amber-200">
                        Plan expired — revive via Control
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm opacity-95">{focusedScoutCard.thesis.currentHypothesis}</p>
                  {focusedScoutCard.thesis.thesis ? (
                    <p className="mt-2 text-xs opacity-70 line-clamp-3">{focusedScoutCard.thesis.thesis}</p>
                  ) : null}

                  <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                    {focusedScoutCard.levelsView ? (
                      <p className="text-violet-100/90">
                        <PlanMapSummaryLine view={focusedScoutCard.levelsView} />
                      </p>
                    ) : (
                      <p>Min R:R {focusedScoutCard.thesis.riskRules.minimumRR}R — set plan stop</p>
                    )}
                    <p>
                      Invalidation:{" "}
                      <span className="opacity-80">
                        {focusedScoutCard.thesis.riskRules.invalidation.slice(0, 100)}
                        {focusedScoutCard.thesis.riskRules.invalidation.length > 100 ? "…" : ""}
                      </span>
                    </p>
                    <p>
                      Room ${monthly.monthlyLossRoom.toFixed(0)}
                      {monthly.monthlyCapBreached ? " · cap breached" : ""}
                    </p>
                    <p>
                      Scout{" "}
                      {focusedScoutCard.primaryPlan ? (
                        <button
                          type="button"
                          onClick={() => setPlanPanelOpen(true)}
                          className="underline opacity-90 hover:opacity-100"
                        >
                          {focusedScoutCard.primaryPlan.id}
                          {focusedScoutCard.primaryPlan.status === "expired" ? " (expired)" : ""}
                        </button>
                      ) : (
                        "— none —"
                      )}
                      {focusedScoutCard.activeScoutCount > 1
                        ? ` · ${focusedScoutCard.activeScoutCount} active`
                        : ""}
                    </p>
                  </div>

                  <div className="mt-4 border-t border-current/20 pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                      Fills in war room (until completed)
                    </p>
                    {focusedScoutCard.linkedTrades.length === 0 ? (
                      <p className="mt-2 text-xs opacity-70">No open-loop fills for this ticker.</p>
                    ) : (
                      <ul className="mt-2 space-y-1 text-xs">
                        {focusedScoutCard.linkedTrades.map((t) => (
                          <li key={t.id} className="flex flex-wrap justify-between gap-2">
                            <Link
                              href={`/trades/${t.id}`}
                              className="underline opacity-90 hover:opacity-100"
                            >
                              {t.id} · {t.status}
                              {t.status === "closed" ? " · review pending" : ""}
                            </Link>
                            <span className="opacity-70">
                              {t.entry}
                              {t.target !== undefined ? ` → ${t.target}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <SnapshotButton
                      title={snapshotButtonTitle(focusedScoutCard.thesis.ticker, "snapshot")}
                      description="Profile + evidence + scout"
                      className="!px-3 !py-1.5"
                      items={stockProfileSnapshotItems({
                        thesis: focusedScoutCard.thesis,
                        playbooks,
                        plans,
                        activeEvidence,
                      }).filter((item) => item.id !== "mechanics")}
                    />
                    <Link
                      href={`/stock-theses/${focusedScoutCard.thesis.id}`}
                      className="rounded-lg border border-current/30 px-3 py-1.5 text-xs opacity-90 hover:opacity-100"
                    >
                      Full profile
                    </Link>
                  </div>
                </section>
              ) : null}

              {!focusedScoutCard?.orphan ? (
                <ScoutExecutePanel
                  plan={focusPlan}
                  prospect={selectedProspect}
                  prospects={prospects}
                  playbooks={playbooks}
                  suggestedTradeId={suggestedTradeId}
                  monthlyLossRoom={monthly.monthlyLossRoom}
                />
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
  );
}
