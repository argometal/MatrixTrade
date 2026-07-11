"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  activateProbeAction,
  cancelProbeAction,
  createScopedAiGrantAction,
  recordPlanOutcomeAction,
  recordScoutDecisionAction,
  savePlanAction,
  stopProbeAction,
  updatePlanStatusAction,
} from "@/app/actions";
import { buildPlanEnterHref, planNeedsStrategyReview } from "@/lib/plan-helpers";
import { buildAiContextPackage } from "@/lib/ai-context";
import { buildPlanLevelsView } from "@/lib/plan-levels-board";
import { scoutingVerdictStyle } from "@/lib/matrix-mechanics-brief";
import type { MonthlyRisk } from "@/lib/monthly-risk";
import {
  PLAN_EXTERNAL_FACTORS,
  PLAN_FAIL_REASON_LABELS,
  PLAN_STATUS_LABELS,
  PLAN_TIMEFRAMES,
  type PlanTimeframe,
  type TradePlan,
} from "@/lib/plan-types";
import { computePlannedRR, validatePlanAgainstThesis } from "@/lib/plan-risk";
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
  type DecisionVerdict,
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
  monthly,
  experiment,
  focusPlanId,
  focusThesisId,
}: {
  plans: TradePlan[];
  playbooks: Playbook[];
  stockTheses: StockThesis[];
  monthly: MonthlyRisk;
  experiment: Experiment;
  focusPlanId?: string;
  focusThesisId?: string;
}) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [prefillThesisId, setPrefillThesisId] = useState<string | null>(focusThesisId ?? null);
  const [scoutThesisId, setScoutThesisId] = useState<string | null>(focusThesisId ?? null);
  const [copiedTraining, setCopiedTraining] = useState(false);
  const [copiedScouting, setCopiedScouting] = useState(false);
  const [formTicker, setFormTicker] = useState("");
  const [formThesisId, setFormThesisId] = useState("");
  const [formEntry, setFormEntry] = useState("");
  const [formSupport, setFormSupport] = useState("");
  const [formStop, setFormStop] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [outcomePlanId, setOutcomePlanId] = useState<string | null>(
    focusPlanId && plans.some((p) => p.id === focusPlanId && planNeedsStrategyReview(p))
      ? focusPlanId
      : null
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(focusPlanId ?? null);
  const [decisionPlanId, setDecisionPlanId] = useState<string | null>(null);
  const [grantLinks, setGrantLinks] = useState<{
    grantId: string;
    humanPageUrl: string;
    contextUrl: string;
    inboxUrl: string;
    expiresAt: string;
  } | null>(null);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [planPanelOpen, setPlanPanelOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formWarning, setFormWarning] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editing = editingId ? plans.find((p) => p.id === editingId) : undefined;
  const activeTheses = useMemo(
    () => stockTheses.filter((t) => isActiveStockThesisStatus(t.status)),
    [stockTheses]
  );

  const filteredThesesForTicker = useMemo(() => {
    const ticker = formTicker.trim().toUpperCase();
    if (!ticker) return stockTheses;
    return stockTheses.filter((t) => t.ticker.toUpperCase() === ticker);
  }, [stockTheses, formTicker]);

  const selectedThesis = useMemo(() => {
    const id = formThesisId || editing?.stockThesisId || prefillThesisId || "";
    return stockTheses.find((t) => t.id === id);
  }, [stockTheses, formThesisId, editing, prefillThesisId]);

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

  const decisionPlan = useMemo(
    () => (decisionPlanId ? plans.find((p) => p.id === decisionPlanId) : undefined),
    [plans, decisionPlanId]
  );

  const trainingBlockText = useMemo(
    () =>
      buildAiContextPackage({
        scope: "scouting",
        playbooks,
        stockTheses: activeTheses,
        plans,
        monthly,
        experiment,
      }),
    [playbooks, activeTheses, plans, monthly, experiment]
  );

  const scoutingContextText = useMemo(() => {
    if (!scoutThesis) return "";
    return buildAiContextPackage({
      scope: "scouting-ticker",
      focusThesis: scoutThesis,
      plans,
      playbooks,
      monthly,
    });
  }, [scoutThesis, plans, playbooks, monthly]);

  function copyTrainingBlock() {
    void navigator.clipboard.writeText(trainingBlockText).then(() => {
      setCopiedTraining(true);
      setTimeout(() => setCopiedTraining(false), 2000);
    });
  }

  function copyScoutingContext() {
    if (!scoutingContextText) return;
    void navigator.clipboard.writeText(scoutingContextText).then(() => {
      setCopiedScouting(true);
      setTimeout(() => setCopiedScouting(false), 2000);
    });
  }

  const rrPreview = useMemo(() => {
    const entry = Number(formEntry);
    const stop = Number(formStop);
    const target = Number(formTarget);
    if (!Number.isFinite(entry) || !Number.isFinite(stop) || !Number.isFinite(target)) {
      return null;
    }
    const computed = computePlannedRR(entry, stop, target);
    if (!computed) return null;
    const validation = selectedThesis
      ? validatePlanAgainstThesis({ entry, stop, target }, selectedThesis.riskRules)
      : {};
    return { ...computed, warning: validation.warning };
  }, [formEntry, formStop, formTarget, selectedThesis]);

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
        return plans.filter(planNeedsStrategyReview);
      default:
        return plans;
    }
  }, [plans, filter]);

  const defaultFrames: PlanTimeframe[] = ["1D", "1H", "15m", "5m"];

  useEffect(() => {
    if (!focusThesisId) return;
    const thesis = stockTheses.find((t) => t.id === focusThesisId);
    if (!thesis) return;
    setPrefillThesisId(thesis.id);
    setScoutThesisId(thesis.id);
    setFormTicker(thesis.ticker);
    setFormThesisId(thesis.id);
    setShowForm(true);
  }, [focusThesisId, stockTheses]);

  function resetFormLevels() {
    setFormEntry("");
    setFormSupport("");
    setFormStop("");
    setFormTarget("");
  }

  function openCreate() {
    setEditingId(null);
    setPrefillThesisId(null);
    setFormTicker("");
    setFormThesisId("");
    resetFormLevels();
    setShowForm(true);
    setFormError(null);
    setFormWarning(null);
  }

  function openCreateFromThesis(thesis: StockThesis) {
    setEditingId(null);
    setPrefillThesisId(thesis.id);
    setFormTicker(thesis.ticker);
    setFormThesisId(thesis.id);
    resetFormLevels();
    setShowForm(true);
    setFormError(null);
    setFormWarning(null);
  }

  function openEdit(plan: TradePlan) {
    setEditingId(plan.id);
    setPrefillThesisId(null);
    setFormTicker(plan.ticker);
    setFormThesisId(plan.stockThesisId ?? "");
    setFormEntry(plan.plannedEntry !== undefined ? String(plan.plannedEntry) : "");
    setFormSupport(plan.supportLevel !== undefined ? String(plan.supportLevel) : "");
    setFormStop(plan.stopPrice !== undefined ? String(plan.stopPrice) : "");
    setFormTarget(plan.targetPrice !== undefined ? String(plan.targetPrice) : "");
    setShowForm(true);
    setFormError(null);
    setFormWarning(null);
  }

  function runStatus(planId: string, status: TradePlan["status"]) {
    startTransition(async () => {
      await updatePlanStatusAction(planId, status);
    });
  }

  function submitForm(formData: FormData) {
    startTransition(async () => {
      const result = await savePlanAction(formData);
      if ("error" in result) {
        setFormError(result.error);
        return;
      }
      setShowForm(false);
      setEditingId(null);
      setPrefillThesisId(null);
      setFormError(null);
      setFormWarning(result.warning ?? null);
    });
  }

  function submitOutcome(formData: FormData) {
    if (!outcomePlanId) return;
    startTransition(async () => {
      const result = await recordPlanOutcomeAction(outcomePlanId, formData);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setOutcomePlanId(null);
      setFormError(null);
    });
  }

  function submitDecision(formData: FormData) {
    startTransition(async () => {
      const result = await recordScoutDecisionAction(formData);
      if ("error" in result) {
        setFormError(result.error);
        return;
      }
      setDecisionPlanId(null);
      setFormError(null);
    });
  }

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

  function runProbeAction(planId: string, action: "activate" | "cancel" | "stop") {
    startTransition(async () => {
      const fn =
        action === "activate"
          ? activateProbeAction
          : action === "cancel"
            ? cancelProbeAction
            : stopProbeAction;
      const result = await fn(planId);
      if (result.error) setFormError(result.error);
    });
  }

  const outcomePlan = outcomePlanId
    ? plans.find((p) => p.id === outcomePlanId)
    : undefined;

  const defaultThesisId =
    editing?.stockThesisId ?? prefillThesisId ?? formThesisId ?? "";

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
                Copy package → ChatGPT →{" "}
                <Link href="/exchange" className="text-violet-400 hover:underline">
                  Assistant
                </Link>{" "}
                import →{" "}
                <Link href="/inbox" className="text-violet-400 hover:underline">
                  Inbox
                </Link>{" "}
                Apply (`stock-case-create` / `scout-assessment` / `decision-update` / `file-update`)
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/stock-theses/new"
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20"
              >
                New stock case
              </Link>
              <button
                type="button"
                onClick={copyTrainingBlock}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
              >
                {copiedTraining ? "Copied" : "Copy AI training block"}
              </button>
              {scoutThesis ? (
                <button
                  type="button"
                  onClick={copyScoutingContext}
                  className="rounded-lg border border-violet-500/30 px-3 py-2 text-xs text-violet-400 hover:bg-violet-500/10"
                >
                  {copiedScouting ? "Copied" : "Copy scouting context"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={openCreate}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
              >
                Log setup
              </button>
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
                  <button
                    type="button"
                    onClick={() => {
                      setDecisionPlanId(selectedPlan.id);
                      setFormError(null);
                    }}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100"
                  >
                    Record decision
                  </button>
                  <form action={createScoutAiLink}>
                    <input type="hidden" name="stockProfileId" value={selectedPlan.stockThesisId ?? ""} />
                    <input type="hidden" name="planId" value={selectedPlan.id} />
                    <button
                      type="submit"
                      disabled={pending || !selectedPlan.stockThesisId}
                      className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-500/20 disabled:opacity-50"
                    >
                      Create scout AI link
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedPlan.probe.status === "authorized" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => runProbeAction(selectedPlan.id, "activate")}
                        className="rounded-lg bg-violet-600/30 px-3 py-1.5 text-xs text-violet-300"
                      >
                        Activate probe
                      </button>
                    ) : null}
                    {selectedPlan.probe.status === "active" ? (
                      <>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => runProbeAction(selectedPlan.id, "stop")}
                          className="rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs text-amber-400"
                        >
                          Stop probe (-0.10R)
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => runProbeAction(selectedPlan.id, "cancel")}
                          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400"
                        >
                          Cancel probe
                        </button>
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

          {activeTheses.length > 0 ? (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h2 className="text-sm font-semibold text-zinc-200">Active stock files</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Strategic memory per ticker — link scouts to a file for R:R validation.
              </p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {activeTheses.map((thesis) => (
                  <li
                    key={thesis.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/stock-theses/${thesis.id}`}
                        className="font-semibold text-violet-400 hover:text-violet-300"
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
                    <p className="mt-2 line-clamp-2 text-xs text-zinc-500">
                      {thesis.currentHypothesis}
                    </p>
                    <p className="mt-2 text-xs text-zinc-600">
                      Min {thesis.riskRules.minimumRR}R · {thesis.style}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setScoutThesisId(thesis.id);
                        openCreateFromThesis(thesis);
                      }}
                      className="mt-3 rounded-lg border border-violet-500/30 px-3 py-1.5 text-xs font-medium text-violet-400 hover:bg-violet-500/10"
                    >
                      Log setup from file
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {formWarning && !showForm ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
              {formWarning}
            </p>
          ) : null}

          {showForm && (
            <section className="rounded-2xl border border-violet-500/30 bg-zinc-900/80 p-5">
              <h2 className="text-sm font-semibold text-zinc-200">
                {editing ? `Edit ${editing.id}` : "Log scout setup"}
              </h2>
              <form action={submitForm} className="mt-4 space-y-4">
                {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="block text-xs text-zinc-500">
                    Ticker
                    <input
                      name="ticker"
                      required
                      value={formTicker}
                      onChange={(e) => {
                        setFormTicker(e.target.value);
                        setFormThesisId("");
                      }}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    />
                  </label>
                  <label className="block text-xs text-zinc-500">
                    Stock file
                    <select
                      name="stockThesisId"
                      value={formThesisId || defaultThesisId}
                      onChange={(e) => setFormThesisId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    >
                      <option value="">—</option>
                      {filteredThesesForTicker.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.id} · {STOCK_THESIS_STATUS_LABELS[t.status]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs text-zinc-500">
                    Strategy
                    <select
                      name="playbookId"
                      defaultValue={editing?.playbookId ?? ""}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    >
                      <option value="">—</option>
                      {playbooks.map((pb) => (
                        <option key={pb.id} value={pb.id}>
                          {pb.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs text-zinc-500">
                    Entry timeframe (smallest)
                    <select
                      name="entryTimeframe"
                      defaultValue={editing?.entryTimeframe ?? "5m"}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    >
                      {PLAN_TIMEFRAMES.map((tf) => (
                        <option key={tf} value={tf}>
                          {tf}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <fieldset>
                  <legend className="text-xs text-zinc-500">Analysis timeframes</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {PLAN_TIMEFRAMES.map((tf) => {
                      const selected = editing
                        ? editing.analysisTimeframes.includes(tf)
                        : defaultFrames.includes(tf);
                      return (
                        <label
                          key={tf}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
                        >
                          <input
                            type="checkbox"
                            name="analysisTimeframes"
                            value={tf}
                            defaultChecked={selected}
                          />
                          {tf}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {(
                    [
                      ["plannedEntry", "Planned entry", formEntry, setFormEntry],
                      ["supportLevel", "Support", formSupport, setFormSupport],
                      ["stopPrice", "Stop", formStop, setFormStop],
                      ["targetPrice", "Target", formTarget, setFormTarget],
                    ] as const
                  ).map(([name, label, value, setter]) => (
                    <label key={name} className="block text-xs text-zinc-500">
                      {label}
                      <input
                        name={name}
                        type="number"
                        step="0.01"
                        value={value}
                        onChange={(e) => setter(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                      />
                    </label>
                  ))}
                  <label className="block text-xs text-zinc-500">
                    Planned R:R
                    <input
                      name="plannedRR"
                      type="number"
                      step="0.1"
                      readOnly
                      value={rrPreview ? rrPreview.rr.toFixed(1) : editing?.plannedRR !== undefined ? String(editing.plannedRR) : ""}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    />
                  </label>
                </div>

                {selectedThesis && rrPreview ? (
                  <p
                    className={`text-xs ${
                      rrPreview.warning ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    Computed R:R {rrPreview.rr.toFixed(1)} vs thesis minimum{" "}
                    {selectedThesis.riskRules.minimumRR}R
                    {rrPreview.warning ? ` — ${rrPreview.warning}` : ""}
                  </p>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs text-zinc-500">
                    Valid from
                    <input
                      name="validFrom"
                      type="datetime-local"
                      defaultValue={
                        editing?.validFrom
                          ? new Date(editing.validFrom).toISOString().slice(0, 16)
                          : ""
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    />
                  </label>
                  <label className="block text-xs text-zinc-500">
                    Valid until (auto-expires)
                    <input
                      name="validUntil"
                      type="datetime-local"
                      defaultValue={
                        editing?.validUntil
                          ? new Date(editing.validUntil).toISOString().slice(0, 16)
                          : ""
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    />
                  </label>
                </div>

                <label className="block text-xs text-zinc-500">
                  Thesis
                  <textarea
                    name="thesis"
                    rows={2}
                    defaultValue={editing?.thesis ?? ""}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>
                <label className="block text-xs text-zinc-500">
                  Chat notes (paste from Assistant — not auto-applied)
                  <textarea
                    name="chatNotes"
                    rows={3}
                    defaultValue={editing?.chatNotes ?? ""}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                  />
                </label>

                {formError ? <p className="text-sm text-red-400">{formError}</p> : null}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    {editing ? "Save scout" : "Create scout"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setPrefillThesisId(null);
                      setFormError(null);
                    }}
                    className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          )}

          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No scouts in this view. Log a setup to track a candidate before it becomes a trade.
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
                      Decision
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(plan)}
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      Edit
                    </button>
                    {plan.status === "watching" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => runStatus(plan.id, "ready")}
                        className="rounded-lg bg-emerald-600/20 px-3 py-1.5 text-xs font-medium text-emerald-400"
                      >
                        Mark ready
                      </button>
                    ) : null}
                    {plan.status === "ready" || plan.status === "watching" ? (
                      <Link
                        href={buildPlanEnterHref(plan)}
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
                      >
                        Enter trade →
                      </Link>
                    ) : null}
                    {plan.status === "watching" || plan.status === "ready" ? (
                      <>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => runStatus(plan.id, "skipped")}
                          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400"
                        >
                          Skip
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            startTransition(async () => {
                              await updatePlanStatusAction(plan.id, "failed");
                              setOutcomePlanId(plan.id);
                            });
                          }}
                          className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400"
                        >
                          Mark failed
                        </button>
                      </>
                    ) : null}
                    {planNeedsStrategyReview(plan) ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOutcomePlanId(plan.id);
                          setFormError(null);
                        }}
                        className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-400"
                      >
                        Evaluate strategy
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {decisionPlan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
            <h3 className="text-lg font-semibold text-zinc-100">
              Record decision · {decisionPlan.ticker} ({decisionPlan.id})
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Appends to decision history — does not create a trade.
            </p>
            <form action={submitDecision} className="mt-4 space-y-4">
              <input type="hidden" name="planId" value={decisionPlan.id} />
              <label className="block text-xs text-zinc-500">
                Verdict
                <select
                  name="verdict"
                  defaultValue={decisionPlan.decision?.verdict ?? "wait"}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                >
                  {(["wait", "probe", "go", "no"] as DecisionVerdict[]).map((v) => (
                    <option key={v} value={v}>
                      {DECISION_VERDICT_LABELS[v]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-zinc-500">
                Confidence (0-100)
                <input
                  name="decisionConfidence"
                  type="number"
                  min={0}
                  max={100}
                  required
                  defaultValue={decisionPlan.decision?.decisionConfidence ?? 50}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-xs text-zinc-500">
                Challenge (required)
                <input
                  name="challengeText"
                  required
                  placeholder="One real contradiction or risk"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <label className="block text-xs text-zinc-500">
                Reasoning
                <textarea
                  name="reasoning"
                  rows={2}
                  defaultValue={decisionPlan.decision?.reasoning ?? ""}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <fieldset className="rounded-lg border border-violet-500/20 p-3">
                <legend className="px-1 text-xs text-violet-300">Probe fields (when verdict = probe)</legend>
                <div className="mt-2 space-y-3">
                  <label className="block text-xs text-zinc-500">
                    Trigger
                    <input
                      name="probeTrigger"
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    />
                  </label>
                  <label className="block text-xs text-zinc-500">
                    Expires
                    <input
                      name="probeExpires"
                      type="datetime-local"
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    />
                  </label>
                  <label className="block text-xs text-zinc-500">
                    Risk (R units, default 0.10)
                    <input
                      name="probeRiskPercent"
                      type="number"
                      step="0.01"
                      defaultValue={0.1}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    />
                  </label>
                </div>
              </fieldset>
              {formError ? <p className="text-sm text-red-400">{formError}</p> : null}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white"
                >
                  Save decision
                </button>
                <button
                  type="button"
                  onClick={() => setDecisionPlanId(null)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {outcomePlan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
            <h3 className="text-lg font-semibold text-zinc-100">
              Evaluate · {outcomePlan.ticker} ({outcomePlan.id})
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Was the strategy sound? Record context for AI analysis later.
            </p>
            <form action={submitOutcome} className="mt-4 space-y-4">
              <fieldset>
                <legend className="text-xs text-zinc-500">Strategy still valid?</legend>
                <div className="mt-2 flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input type="radio" name="strategyStillValid" value="yes" required />
                    Yes — external factors
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input type="radio" name="strategyStillValid" value="no" required />
                    No — rethink playbook
                  </label>
                </div>
              </fieldset>
              <label className="block text-xs text-zinc-500">
                Reason
                <select
                  name="reason"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                >
                  <option value="">—</option>
                  {Object.entries(PLAN_FAIL_REASON_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset>
                <legend className="text-xs text-zinc-500">External factors</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PLAN_EXTERNAL_FACTORS.map((factor) => (
                    <label
                      key={factor}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
                    >
                      <input type="checkbox" name="externalFactors" value={factor} />
                      {factor}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="block text-xs text-zinc-500">
                Lesson (saved for AI export)
                <textarea
                  name="lesson"
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              {formError ? <p className="text-sm text-red-400">{formError}</p> : null}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white"
                >
                  Save evaluation
                </button>
                <button
                  type="button"
                  onClick={() => setOutcomePlanId(null)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

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
