"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SnapshotButton } from "@/app/components/preview/SnapshotButton";
import { buildPlanLevelsView } from "@/lib/plan-levels-board";
import { scoutingVerdictStyle } from "@/lib/matrix-mechanics-brief";
import type { MarketEvidence } from "@/lib/market-evidence-types";
import type { MonthlyRisk } from "@/lib/monthly-risk";
import type { TradePlan } from "@/lib/plan-types";
import type { Playbook } from "@/lib/playbook-types";
import {
  resolveScoutingVerdict,
  SCOUTING_VERDICT_LABELS,
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
import type { Experiment } from "@/lib/types";

const thesisStatusStyles: Record<string, string> = {
  draft: "bg-zinc-700/50 text-zinc-400",
  watching: "bg-sky-500/15 text-sky-300",
  actionable: "bg-emerald-500/15 text-emerald-400",
  invalidated: "bg-red-500/15 text-red-400",
  archived: "bg-zinc-700/50 text-zinc-500",
};

export function PreviewPlanning({
  plans,
  playbooks,
  stockTheses,
  marketEvidence,
  monthly,
  experiment,
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
  focusPlanId?: string;
  focusThesisId?: string;
  snapshotItems: SnapshotMenuItem[];
}) {
  const [scoutThesisId, setScoutThesisId] = useState<string | null>(focusThesisId ?? null);
  const [planPanelOpen, setPlanPanelOpen] = useState(false);
  const activeTheses = useMemo(
    () => stockTheses.filter((t) => isActiveStockThesisStatus(t.status)),
    [stockTheses]
  );

  const activeEvidenceByProfile = useMemo(() => {
    const superseded = new Set(
      marketEvidence.map((row) => row.supersededBy).filter(Boolean) as string[]
    );
    const map = new Map<string, MarketEvidence[]>();
    for (const row of marketEvidence) {
      if (row.supersededBy || superseded.has(row.id)) continue;
      const key = row.stockProfileId.toUpperCase();
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => b.observedAt.localeCompare(a.observedAt));
    }
    return map;
  }, [marketEvidence]);

  const scoutCards = useMemo(() => {
    return activeTheses.map((thesis) => {
      const thesisPlans = plans.filter((p) => p.stockThesisId === thesis.id);
      const activePlans = thesisPlans.filter((p) => p.status === "watching" || p.status === "ready");
      const primaryPlan = activePlans[0] ?? thesisPlans[0];
      const levelsView = buildPlanLevelsView(thesis, primaryPlan);
      const decisionPlan = thesisPlans.find((p) => p.decision) ?? primaryPlan;
      const verdict = resolveScoutingVerdict(thesis, decisionPlan);
      return {
        thesis,
        thesisPlans,
        primaryPlan,
        levelsView,
        verdict,
        activeScoutCount: activePlans.length,
      };
    });
  }, [activeTheses, plans]);

  const focusedScoutCard = useMemo(() => {
    const id = scoutThesisId ?? focusThesisId ?? activeTheses[0]?.id ?? "";
    return scoutCards.find((card) => card.thesis.id === id) ?? scoutCards[0] ?? null;
  }, [scoutCards, scoutThesisId, focusThesisId, activeTheses]);

  const scoutThesis = focusedScoutCard?.thesis;
  const scoutPrimaryPlan = focusedScoutCard?.primaryPlan;
  const scoutLevelsView = focusedScoutCard?.levelsView ?? null;

  const focusPlan = useMemo(() => {
    if (focusPlanId) return plans.find((p) => p.id === focusPlanId);
    return scoutPrimaryPlan;
  }, [plans, focusPlanId, scoutPrimaryPlan]);

  const panelLevelsView = scoutLevelsView;

  const snapshotTitle = useMemo(() => {
    const focusThesis =
      scoutThesis ??
      (focusThesisId ? stockTheses.find((t) => t.id === focusThesisId) : undefined);
    if (focusPlan) return snapshotButtonTitle(focusPlan.ticker, `${focusPlan.id} snapshot`);
    if (focusThesis) return snapshotButtonTitle(focusThesis.ticker, "snapshot");
    return "Scout snapshot";
  }, [scoutThesis, focusThesisId, focusPlan, stockTheses]);

  const snapshotItems = useMemo(() => {
    const focusThesis =
      scoutThesis ??
      (focusThesisId ? stockTheses.find((t) => t.id === focusThesisId) : undefined);
    return scoutDeskSnapshotItems({
      playbooks,
      stockTheses: activeTheses,
      plans,
      monthly,
      experiment,
      marketEvidence,
      focusThesis,
      focusPlan,
    });
  }, [
    scoutThesis,
    focusThesisId,
    focusPlan,
    stockTheses,
    plans,
    playbooks,
    activeTheses,
    monthly,
    experiment,
    marketEvidence,
  ]);

  useEffect(() => {
    if (!focusThesisId) return;
    setScoutThesisId(focusThesisId);
  }, [focusThesisId]);

  useEffect(() => {
    if (!focusPlanId) return;
    const plan = plans.find((p) => p.id === focusPlanId);
    if (plan?.stockThesisId) setScoutThesisId(plan.stockThesisId);
  }, [focusPlanId, plans]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden lg:flex-row">
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain pb-10">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">Scouting Desk</h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                Decide go / wait / no — before Enter Trade.
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Playbook = HOW · Stock File = WHO · snapshot → AI → Control → Update
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
                description="Desk overview, ticker, scout plan, or mechanics"
                items={snapshotItems.length > 0 ? snapshotItems : initialSnapshotItems}
              />
            </div>
          </div>
        </header>

        <div className="space-y-4 px-4 py-4 lg:px-6">
          {activeTheses.length > 0 ? (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-zinc-200">Scouting summary</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Gatekeeper view — verdict from Stock File status + risk room.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {scoutLevelsView ? (
                    <PlanMapToggleButton
                      open={planPanelOpen}
                      onClick={() => setPlanPanelOpen((v) => !v)}
                      view={scoutLevelsView}
                    />
                  ) : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label htmlFor="scout-summary-select" className="text-xs font-medium text-zinc-500">
                  Stock file
                </label>
                <select
                  id="scout-summary-select"
                  value={focusedScoutCard?.thesis.id ?? ""}
                  onChange={(event) => setScoutThesisId(event.target.value)}
                  className="min-w-[12rem] rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-violet-500/50 focus:outline-none"
                >
                  {scoutCards.map((card) => (
                    <option key={card.thesis.id} value={card.thesis.id}>
                      {card.thesis.ticker} · {card.thesis.id} · {SCOUTING_VERDICT_LABELS[card.verdict]}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-1.5">
                  {scoutCards.map((card) => {
                    const selected = card.thesis.id === focusedScoutCard?.thesis.id;
                    return (
                      <button
                        key={card.thesis.id}
                        type="button"
                        onClick={() => setScoutThesisId(card.thesis.id)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          selected
                            ? "bg-violet-600 text-white"
                            : "border border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                        }`}
                      >
                        {card.thesis.ticker}
                      </button>
                    );
                  })}
                </div>
              </div>

              {focusedScoutCard ? (
                <div
                  className={`mt-4 rounded-xl border p-4 ${scoutingVerdictStyle(focusedScoutCard.verdict)}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/stock-theses/${focusedScoutCard.thesis.id}`}
                      className="text-lg font-semibold hover:underline"
                    >
                      {focusedScoutCard.thesis.ticker}
                    </Link>
                    <span className="text-xs opacity-70">{focusedScoutCard.thesis.id}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                        thesisStatusStyles[focusedScoutCard.thesis.status] ?? "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {STOCK_THESIS_STATUS_LABELS[focusedScoutCard.thesis.status]}
                    </span>
                    <span className="rounded-full border border-current px-2 py-0.5 text-xs font-bold uppercase">
                      {SCOUTING_VERDICT_LABELS[focusedScoutCard.verdict]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm opacity-90">{focusedScoutCard.thesis.currentHypothesis}</p>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                    {focusedScoutCard.levelsView ? (
                      <p className="text-violet-200/90">
                        <PlanMapSummaryLine view={focusedScoutCard.levelsView} />
                      </p>
                    ) : null}
                    {!focusedScoutCard.levelsView?.plannedRR ? (
                      <p>
                        Min R:R {focusedScoutCard.thesis.riskRules.minimumRR}R — set strategy stop on plan
                        for R
                      </p>
                    ) : null}
                    <p>
                      Invalidation:{" "}
                      <span className="opacity-80">
                        {focusedScoutCard.thesis.riskRules.invalidation.slice(0, 80)}
                        {focusedScoutCard.thesis.riskRules.invalidation.length > 80 ? "…" : ""}
                      </span>
                    </p>
                    <p>
                      Monthly room: ${monthly.monthlyLossRoom.toFixed(0)}
                      {monthly.monthlyCapBreached ? " (cap breached)" : ""}
                    </p>
                    <p>
                      Active scouts: {focusedScoutCard.activeScoutCount}
                      {focusedScoutCard.primaryPlan ? (
                        <>
                          {" "}
                          ·{" "}
                          <button
                            type="button"
                            onClick={() => setPlanPanelOpen(true)}
                            className="underline opacity-80 hover:opacity-100"
                          >
                            {focusedScoutCard.primaryPlan.id}
                          </button>
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-2xl border border-violet-500/30 bg-violet-950/10 p-5">
            <h2 className="text-sm font-semibold text-violet-200">Stock profiles — start here</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Visualization only. Copy a snapshot → discuss in external AI → import result in Dashboard or
              History → Apply. Thesis on profile (WHO); playbook = method (HOW).
            </p>
            {activeTheses.length === 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <p className="text-sm text-zinc-500">No active stock files yet.</p>
                <Link
                  href="/stock-theses/new"
                  className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20"
                >
                  New stock case (AI boot package)
                </Link>
              </div>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {activeTheses.map((thesis) => {
                  const evidenceCount =
                    activeEvidenceByProfile.get(thesis.id.toUpperCase())?.length ?? 0;
                  return (
                    <li
                      key={thesis.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/stock-theses/${thesis.id}`}
                          className="text-lg font-semibold text-violet-400 hover:text-violet-300"
                        >
                          {thesis.ticker}
                        </Link>
                        <span className="text-xs text-zinc-600">{thesis.id}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            thesisStatusStyles[thesis.status] ?? "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {STOCK_THESIS_STATUS_LABELS[thesis.status]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-300">{thesis.currentHypothesis}</p>
                      {thesis.thesis ? (
                        <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{thesis.thesis}</p>
                      ) : null}
                      <p className="mt-2 text-xs text-zinc-600">
                        {thesis.style} · min {thesis.riskRules.minimumRR}R
                        {evidenceCount > 0 ? ` · ${evidenceCount} evidence` : ""}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <SnapshotButton
                          title={snapshotButtonTitle(thesis.ticker, "snapshot")}
                          description="Stock profile, evidence, scouts for this ticker"
                          className="!px-3 !py-1.5"
                          items={stockProfileSnapshotItems({
                            thesis,
                            playbooks,
                            plans,
                            activeEvidence:
                              activeEvidenceByProfile.get(thesis.id.toUpperCase()) ?? [],
                          }).filter((item) => item.id !== "mechanics")}
                        />
                        <Link
                          href={`/stock-theses/${thesis.id}`}
                          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                        >
                          Open profile
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

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
