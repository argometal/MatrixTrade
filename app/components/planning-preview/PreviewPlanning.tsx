"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  activateProbeAction,
  cancelProbeAction,
  convertProbeAction,
  createScopedAiGrantAction,
  stopProbeAction,
} from "@/app/actions";
import { ImportAiUpdateLink } from "@/app/components/preview/ImportAiUpdateLink";
import { SnapshotButton } from "@/app/components/preview/SnapshotButton";
import { buildPlanEnterHref } from "@/lib/plan-helpers";
import { buildPlanLevelsView } from "@/lib/plan-levels-board";
import { scoutingVerdictStyle } from "@/lib/matrix-mechanics-brief";
import type { MarketEvidence } from "@/lib/market-evidence-types";
import type { MonthlyRisk } from "@/lib/monthly-risk";
import { PLAN_STATUS_LABELS, type TradePlan } from "@/lib/plan-types";
import type { Playbook } from "@/lib/playbook-types";
import { getPlaybookName } from "@/lib/playbook-helpers";
import {
  computeScoutingVerdictFromThesis,
  resolveScoutingVerdict,
  SCOUTING_VERDICT_LABELS,
} from "@/lib/scouting-types";
import {
  DECISION_VERDICT_LABELS,
  SCOUT_LIFECYCLE_LABELS,
} from "@/lib/scout-decision-types";
import { formatProbeRiskMessage } from "@/lib/scout-probe";
import { PROBE_STATUS_LABELS } from "@/lib/scout-probe-types";
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
import type { SnapshotMenuItem } from "@/lib/snapshot-types";
import type { Experiment } from "@/lib/types";

type FilterId = "all" | "active" | "ready" | "failed" | "expired" | "evaluate";

const statusStyles: Record<string, string> = {
  watching: "bg-sky-500/15 text-sky-300",
  ready: "bg-emerald-500/15 text-emerald-400",
  entered: "bg-violet-500/15 text-violet-300",
  skipped: "bg-zinc-700/50 text-zinc-400",
  failed: "bg-red-500/15 text-red-400",
  expired: "bg-amber-500/15 text-amber-400",
};

const thesisStatusStyles: Record<string, string> = {
  draft: "bg-zinc-700/50 text-zinc-400",
  watching: "bg-sky-500/15 text-sky-300",
  actionable: "bg-emerald-500/15 text-emerald-400",
  invalidated: "bg-red-500/15 text-red-400",
  archived: "bg-zinc-700/50 text-zinc-500",
};

function formatLevel(value?: number): string {
  if (value === undefined) return "—";
  return `$${value.toFixed(2)}`;
}

function formatWindow(plan: TradePlan): string {
  if (!plan.validFrom && !plan.validUntil) return "Open";
  const from = plan.validFrom ? new Date(plan.validFrom).toLocaleDateString() : "…";
  const until = plan.validUntil ? new Date(plan.validUntil).toLocaleDateString() : "…";
  return `${from} → ${until}`;
}

function getThesisLabel(theses: StockThesis[], id?: string): string | undefined {
  if (!id) return undefined;
  const thesis = theses.find((t) => t.id === id);
  return thesis ? `${thesis.ticker} · ${thesis.id}` : id;
}

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
  const [filter, setFilter] = useState<FilterId>("all");
  const [scoutThesisId, setScoutThesisId] = useState<string | null>(focusThesisId ?? null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(focusPlanId ?? null);
  const [grantLinks, setGrantLinks] = useState<{
    grantId: string;
    humanPageUrl: string;
    contextUrl: string;
    inboxUrl: string;
    expiresAt: string;
  } | null>(null);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [planPanelOpen, setPlanPanelOpen] = useState(false);
  const [pending, startTransition] = useTransition();
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

  const scoutThesis = useMemo(() => {
    const id = scoutThesisId ?? focusThesisId ?? activeTheses[0]?.id ?? "";
    return stockTheses.find((t) => t.id === id);
  }, [stockTheses, scoutThesisId, focusThesisId, activeTheses]);

  const scoutPlans = useMemo(
    () =>
      scoutThesis
        ? plans.filter((p) => p.stockThesisId === scoutThesis.id)
        : [],
    [plans, scoutThesis]
  );

  const scoutPrimaryPlan = useMemo(() => {
    const active = scoutPlans.filter((p) => p.status === "watching" || p.status === "ready");
    return active[0] ?? scoutPlans[0];
  }, [scoutPlans]);

  const scoutLevelsView = useMemo(() => {
    if (!scoutThesis) return null;
    return buildPlanLevelsView(scoutThesis, scoutPrimaryPlan);
  }, [scoutThesis, scoutPrimaryPlan]);

  const scoutVerdict = useMemo(() => {
    if (!scoutThesis) return null;
    const primaryPlan = scoutPlans.find((p) => p.decision) ?? scoutPlans[0];
    return resolveScoutingVerdict(scoutThesis, primaryPlan);
  }, [scoutThesis, scoutPlans]);

  const selectedPlan = useMemo(
    () => (selectedPlanId ? plans.find((p) => p.id === selectedPlanId) : undefined),
    [plans, selectedPlanId]
  );

  const panelLevelsView = useMemo(() => {
    if (selectedPlan?.stockThesisId) {
      const thesis = stockTheses.find((t) => t.id === selectedPlan.stockThesisId);
      if (thesis) return buildPlanLevelsView(thesis, selectedPlan);
    }
    return scoutLevelsView;
  }, [selectedPlan, stockTheses, scoutLevelsView]);

  const snapshotItems = useMemo(() => {
    const focusThesis =
      scoutThesis ??
      (focusThesisId ? stockTheses.find((t) => t.id === focusThesisId) : undefined);
    const focusPlan = selectedPlan ?? (focusPlanId ? plans.find((p) => p.id === focusPlanId) : undefined);
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
    selectedPlan,
    focusPlanId,
    stockTheses,
    plans,
    playbooks,
    activeTheses,
    monthly,
    experiment,
    marketEvidence,
  ]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "active":
        return plans.filter((p) => p.status === "watching" || p.status === "ready");
      case "ready":
        return plans.filter((p) => p.status === "ready");
      case "failed":
        return plans.filter((p) => p.status === "failed");
      case "expired":
        return plans.filter((p) => p.status === "expired");
      case "evaluate":
        return plans.filter((p) => p.status === "failed" || p.status === "expired");
      default:
        return plans;
    }
  }, [plans, filter]);

  useEffect(() => {
    if (!focusThesisId) return;
    setScoutThesisId(focusThesisId);
  }, [focusThesisId]);

  function createScoutAiLink(formData: FormData) {
    startTransition(async () => {
      const result = await createScopedAiGrantAction(formData);
      if ("error" in result) {
        setGrantError(result.error);
        setGrantLinks(null);
        return;
      }
      setGrantError(null);
      setGrantLinks(result);
    });
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden lg:flex-row">
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">Scouting Desk</h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                <Link href="/playbook" className="text-violet-400 hover:text-violet-300">
                  Playbook
                </Link>{" "}
                = HOW · Stock File = WHO · Scouting = go / wait / no + risk
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                Visualize → copy snapshot (header) → discuss in your AI → import in{" "}
                <Link href="/home-preview?panel=assistant" className="text-violet-400 hover:underline">
                  Dashboard
                </Link>{" "}
                or{" "}
                <Link href="/inbox" className="text-violet-400 hover:underline">
                  Inbox
                </Link>
                . Open <span className="text-zinc-500">Help</span> on the right for details.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/stock-theses/new"
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20"
              >
                New stock case
              </Link>
              <SnapshotButton
                title="Scout snapshot"
                description="Desk overview, ticker, scout plan, or mechanics"
                items={snapshotItems.length > 0 ? snapshotItems : initialSnapshotItems}
              />
              <ImportAiUpdateLink variant="compact" />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                ["all", "All"],
                ["active", "Active"],
                ["ready", "Ready"],
                ["evaluate", "Needs review"],
                ["failed", "Failed"],
                ["expired", "Expired"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  filter === id
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <div className="space-y-4 px-4 py-4 lg:px-6">
          <section className="rounded-2xl border border-violet-500/30 bg-violet-950/10 p-5">
            <h2 className="text-sm font-semibold text-violet-200">Stock profiles — start here</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Visualization only. Copy a snapshot → discuss in external AI → import result in Dashboard or
              Inbox → Apply. Thesis lives on the profile (WHO); playbook is the method (HOW).
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
                          title={`${thesis.ticker} snapshot`}
                          description="Stock profile, evidence, scouts for this ticker"
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

          {activeTheses.length > 0 ? (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
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
                {activeTheses.length > 1 ? (
                  <label className="text-xs text-zinc-500">
                    Ticker
                    <select
                      value={scoutThesis?.id ?? ""}
                      onChange={(e) => setScoutThesisId(e.target.value || null)}
                      className="ml-2 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100"
                    >
                      {activeTheses.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.ticker} · {t.id}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                </div>
              </div>

              {scoutThesis && scoutVerdict ? (
                <div
                  className={`mt-4 rounded-xl border p-4 ${scoutingVerdictStyle(scoutVerdict)}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/stock-theses/${scoutThesis.id}`}
                      className="text-lg font-semibold hover:underline"
                    >
                      {scoutThesis.ticker}
                    </Link>
                    <span className="text-xs opacity-70">{scoutThesis.id}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                        thesisStatusStyles[scoutThesis.status] ?? "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {STOCK_THESIS_STATUS_LABELS[scoutThesis.status]}
                    </span>
                    <span className="rounded-full border border-current px-2 py-0.5 text-xs font-bold uppercase">
                      {SCOUTING_VERDICT_LABELS[scoutVerdict]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm opacity-90">{scoutThesis.currentHypothesis}</p>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                    {scoutLevelsView ? (
                      <p className="text-violet-200/90">
                        <PlanMapSummaryLine view={scoutLevelsView} />
                      </p>
                    ) : null}
                    {!scoutLevelsView?.plannedRR && !scoutLevelsView?.estimatedRR ? (
                      <p>Min R:R {scoutThesis.riskRules.minimumRR}R</p>
                    ) : null}
                    <p>
                      Invalidation:{" "}
                      <span className="opacity-80">
                        {scoutThesis.riskRules.invalidation.slice(0, 80)}
                        {scoutThesis.riskRules.invalidation.length > 80 ? "…" : ""}
                      </span>
                    </p>
                    <p>
                      Monthly room: ${monthly.monthlyLossRoom.toFixed(0)}
                      {monthly.monthlyCapBreached ? " (cap breached)" : ""}
                    </p>
                    <p>
                      Active scouts:{" "}
                      {scoutPlans.filter((p) => p.status === "watching" || p.status === "ready").length}
                      {scoutPrimaryPlan ? (
                        <>
                          {" "}
                          ·{" "}
                          <button
                            type="button"
                            onClick={() => setSelectedPlanId(scoutPrimaryPlan.id)}
                            className="underline opacity-80 hover:opacity-100"
                          >
                            {scoutPrimaryPlan.id}
                          </button>
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {selectedPlan ? (
            <section className="rounded-2xl border border-violet-500/30 bg-zinc-900/80 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-200">
                    Decision · {selectedPlan.ticker} ({selectedPlan.id})
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Stored scout decision — fallback to Stock File status when absent.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {panelLevelsView ? (
                    <PlanMapToggleButton
                      open={planPanelOpen}
                      onClick={() => setPlanPanelOpen((v) => !v)}
                      view={panelLevelsView}
                    />
                  ) : null}
                  <form action={createScoutAiLink}>
                    <input type="hidden" name="stockProfileId" value={selectedPlan.stockThesisId ?? ""} />
                    <input type="hidden" name="planId" value={selectedPlan.id} />
                    <button
                      type="submit"
                      disabled={pending || !selectedPlan.stockThesisId}
                      className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-500/20 disabled:opacity-50"
                    >
                      Create AI access link
                    </button>
                  </form>
                </div>
              </div>

              {selectedPlan.decision ? (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-bold uppercase ${scoutingVerdictStyle(selectedPlan.decision.verdict)}`}
                    >
                      {DECISION_VERDICT_LABELS[selectedPlan.decision.verdict]}
                    </span>
                    <span className="text-xs text-zinc-500">
                      Confidence {selectedPlan.decision.decisionConfidence}
                    </span>
                    {selectedPlan.scoutLifecycle ? (
                      <span className="text-xs text-zinc-600">
                        {SCOUT_LIFECYCLE_LABELS[selectedPlan.scoutLifecycle]}
                      </span>
                    ) : null}
                  </div>
                  {selectedPlan.decision.reasoning ? (
                    <p className="text-sm text-zinc-400">{selectedPlan.decision.reasoning}</p>
                  ) : null}
                  {selectedPlan.decision.challenges.length ? (
                    <ul className="list-disc space-y-1 pl-5 text-xs text-zinc-500">
                      {selectedPlan.decision.challenges.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  ) : null}
                  {(selectedPlan.decision.planningRisk || selectedPlan.decision.executionRisk) && (
                    <div className="grid gap-2 text-xs sm:grid-cols-2">
                      {selectedPlan.decision.planningRisk ? (
                        <div className="rounded-lg bg-zinc-950/60 p-3">
                          <p className="font-medium text-zinc-400">Planning risk</p>
                          <pre className="mt-1 whitespace-pre-wrap text-zinc-500">
                            {JSON.stringify(selectedPlan.decision.planningRisk, null, 2)}
                          </pre>
                        </div>
                      ) : null}
                      {selectedPlan.decision.executionRisk ? (
                        <div className="rounded-lg bg-zinc-950/60 p-3">
                          <p className="font-medium text-zinc-400">Execution risk</p>
                          <pre className="mt-1 whitespace-pre-wrap text-zinc-500">
                            {JSON.stringify(selectedPlan.decision.executionRisk, null, 2)}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm text-zinc-500">
                  No stored decision — showing computed verdict from Stock File status.
                </p>
              )}

              {selectedPlan.probe?.enabled ? (
                <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-950/10 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-violet-200">Probe</p>
                    <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">
                      {PROBE_STATUS_LABELS[selectedPlan.probe.status]}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {formatProbeRiskMessage(selectedPlan.probe)}
                    </span>
                  </div>
                  {selectedPlan.probe.trigger ? (
                    <p className="mt-2 text-xs text-zinc-400">
                      Trigger: {selectedPlan.probe.trigger}
                    </p>
                  ) : null}
                  {selectedPlan.probe.expires ? (
                    <p className="text-xs text-zinc-500">
                      Expires: {new Date(selectedPlan.probe.expires).toLocaleString()}
                    </p>
                  ) : null}
                  {selectedPlan.linkedTradeId ? (
                    <p className="mt-2 text-xs text-emerald-400">
                      Linked trade:{" "}
                      <Link
                        href={`/trades/${selectedPlan.linkedTradeId}`}
                        className="font-medium hover:underline"
                      >
                        {selectedPlan.linkedTradeId}
                      </Link>
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedPlan.probe.status === "authorized" ? (
                      <form action={activateProbeAction.bind(null, selectedPlan.id)}>
                        <button
                          type="submit"
                          className="rounded-lg border border-violet-500/40 px-3 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-500/10"
                        >
                          Activate probe
                        </button>
                      </form>
                    ) : null}
                    {selectedPlan.probe.status === "active" ? (
                      <>
                        <form action={convertProbeAction.bind(null, selectedPlan.id)}>
                          <button
                            type="submit"
                            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
                          >
                            Convert → trade
                          </button>
                        </form>
                        <form action={stopProbeAction.bind(null, selectedPlan.id)}>
                          <button
                            type="submit"
                            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600"
                          >
                            Stop probe
                          </button>
                        </form>
                        <form action={cancelProbeAction.bind(null, selectedPlan.id)}>
                          <button
                            type="submit"
                            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600"
                          >
                            Cancel
                          </button>
                        </form>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {grantError ? <p className="mt-3 text-sm text-red-400">{grantError}</p> : null}
              {grantLinks ? (
                <div className="mt-3 rounded-xl border border-violet-500/30 bg-violet-950/20 p-3 text-xs">
                  <p className="font-medium text-violet-200">
                    AI link · expires {new Date(grantLinks.expiresAt).toLocaleString()}
                  </p>
                  <a
                    href={grantLinks.humanPageUrl}
                    className="mt-1 block break-all text-violet-300 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {grantLinks.humanPageUrl}
                  </a>
                </div>
              ) : null}
            </section>
          ) : null}

          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No scouts in this view. Scouts are created when you Apply stock-case-create or
              decision-update from Inbox.
            </p>
          ) : (
            <ul className="space-y-4">
              {filtered.map((plan) => (
                <li
                  key={plan.id}
                  id={plan.id}
                  className={`rounded-2xl border bg-zinc-900/50 p-5 ${
                    focusPlanId === plan.id
                      ? "border-violet-500/50"
                      : "border-zinc-800"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-zinc-100">
                          {plan.ticker}
                        </h2>
                        <span className="text-sm text-zinc-500">{plan.id}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            statusStyles[plan.status] ?? "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {PLAN_STATUS_LABELS[plan.status]}
                        </span>
                        {plan.decision ? (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${scoutingVerdictStyle(plan.decision.verdict)}`}
                          >
                            {DECISION_VERDICT_LABELS[plan.decision.verdict]}
                          </span>
                        ) : scoutThesis && plan.stockThesisId === scoutThesis.id ? (
                          <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-500">
                            {SCOUTING_VERDICT_LABELS[computeScoutingVerdictFromThesis(scoutThesis)]}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {getPlaybookName(playbooks, plan.playbookId) ?? "No strategy"} · Entry{" "}
                        {plan.entryTimeframe} · Window {formatWindow(plan)}
                      </p>
                      {plan.stockThesisId ? (
                        <p className="mt-1 text-xs text-violet-400">
                          Stock file:{" "}
                          <Link
                            href={`/stock-theses/${plan.stockThesisId}`}
                            className="hover:underline"
                          >
                            {getThesisLabel(stockTheses, plan.stockThesisId) ?? plan.stockThesisId}
                          </Link>
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-zinc-600">
                        Analyze: {plan.analysisTimeframes.join(", ")}
                      </p>
                    </div>
                    <div className="text-right text-xs text-zinc-500">
                      <p>Entry {formatLevel(plan.plannedEntry)}</p>
                      <p>Stop {formatLevel(plan.stopPrice)} · Target {formatLevel(plan.targetPrice)}</p>
                      {plan.plannedRR !== undefined ? <p>R:R {plan.plannedRR.toFixed(1)}</p> : null}
                    </div>
                  </div>

                  {plan.thesis ? (
                    <p className="mt-3 text-sm text-zinc-400">{plan.thesis}</p>
                  ) : null}

                  {plan.outcome ? (
                    <p className="mt-3 rounded-lg bg-zinc-950/80 px-3 py-2 text-xs text-zinc-500">
                      Strategy valid: {plan.outcome.strategyStillValid ? "yes" : "no"}
                      {plan.outcome.lesson ? ` · ${plan.outcome.lesson}` : ""}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs ${
                        selectedPlanId === plan.id
                          ? "border-violet-500/50 text-violet-300"
                          : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      View detail
                    </button>
                    {plan.status === "ready" || plan.status === "watching" ? (
                      <Link
                        href={buildPlanEnterHref(plan)}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
                      >
                        Enter trade →
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <PlanLevelsSidePanel
        view={panelLevelsView}
        open={planPanelOpen}
        onClose={() => setPlanPanelOpen(false)}
        subtitle={
          selectedPlan
            ? `${selectedPlan.id} · scout window`
            : scoutThesis
              ? `${scoutThesis.id} · profile levels`
              : undefined
        }
      />
    </div>
  );
}
