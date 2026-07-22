"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  createScopedAiGrantAction,
  saveStockThesisAction,
} from "@/app/actions";
import { copyText } from "@/app/components/ai-bridge/copy-text";
import { useControlPanel } from "@/app/components/control-panel/MatrixControlPanelProvider";
import { SnapshotButton } from "@/app/components/preview/SnapshotButton";
import { snapshotButtonTitle } from "@/lib/snapshot-verification";
import type { MarketEvidence } from "@/lib/market-evidence-types";
import { buildPlanLevelsView } from "@/lib/plan-levels-board";
import type { Playbook } from "@/lib/playbook-types";
import type { StockProfileSynthesis } from "@/lib/stock-profile-synthesis";
import type { TradePlan } from "@/lib/plan-types";
import { DECISION_VERDICT_LABELS } from "@/lib/scout-decision-types";
import {
  formatStockThesisZone,
  STOCK_THESIS_STATUS_LABELS,
  type StockThesis,
  type StockThesisStatus,
} from "@/lib/stock-thesis-types";
import { PlanLevelsBoard } from "@/app/components/planning-preview/PlanLevelsBoard";
import { PlanMapSummaryLine, PlanMapToggleButton } from "@/app/components/planning-preview/PlanLevelsSidePanel";
import { FamilyBChecklist } from "@/app/components/playbook/FamilyBChecklist";
import type { SnapshotMenuItem } from "@/lib/snapshot-types";
import type { MtaeAssessment } from "@/lib/mtae-types";
import { MtaeEvidenceFirstPanel } from "@/app/components/mtae/MtaeEvidenceFirstPanel";

type ProfileTab = "snapshot" | "evidence" | "history";

const statusStyles: Record<string, string> = {
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

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

export function PreviewStockThesis({
  thesis,
  playbooks = [],
  activeEvidence = [],
  synthesis,
  activePlans = [],
  snapshotItems,
  analyzePackage,
  latestMtaeAssessment,
}: {
  thesis: StockThesis;
  playbooks?: Playbook[];
  activeEvidence?: MarketEvidence[];
  synthesis?: StockProfileSynthesis;
  activePlans?: TradePlan[];
  snapshotItems: SnapshotMenuItem[];
  /** MTA-002A one-copy Analyze package (Mechanics + MTAE + dossier + Scout). */
  analyzePackage: string;
  latestMtaeAssessment?: MtaeAssessment | null;
}) {
  const { openPanel } = useControlPanel();
  const [tab, setTab] = useState<ProfileTab>("snapshot");
  const [planMapOpen, setPlanMapOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [analyzeCopied, setAnalyzeCopied] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [grantLinks, setGrantLinks] = useState<{
    grantId: string;
    humanPageUrl: string;
    contextUrl: string;
    inboxUrl: string;
    expiresAt: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const [grantPending, startGrantTransition] = useTransition();

  function submitForm(formData: FormData) {
    startTransition(async () => {
      const result = await saveStockThesisAction(formData);
      if ("error" in result) {
        setFormError(result.error);
        return;
      }
      setFormError(null);
    });
  }

  function createAiAccessLink(formData: FormData) {
    startGrantTransition(async () => {
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

  async function handleAnalyzeWithAi() {
    const ok = await copyText(analyzePackage);
    if (!ok) return;
    setAnalyzeCopied(true);
    setTimeout(() => setAnalyzeCopied(false), 2500);
  }

  const levelsView = useMemo(
    () => buildPlanLevelsView(thesis, activePlans[0]),
    [thesis, activePlans]
  );

  const primaryPlan = activePlans[0];
  const levels = thesis.levels;
  const tabs: { id: ProfileTab; label: string }[] = [
    { id: "snapshot", label: "Snapshot" },
    { id: "evidence", label: `Evidence (${activeEvidence.length})` },
    { id: "history", label: "History" },
  ];
  const scoutHref = primaryPlan
    ? `/planning?plan=${primaryPlan.id}`
    : `/planning?thesis=${thesis.id}`;

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-zinc-100">{thesis.ticker}</h1>
                <span className="text-sm text-zinc-500">{thesis.id}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    statusStyles[thesis.status] ?? "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {STOCK_THESIS_STATUS_LABELS[thesis.status]}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-zinc-500">
                Stock Profile · {thesis.style} · v{thesis.version}
                {synthesis ? ` · confidence ${synthesis.thesisConfidence}` : ""}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => void handleAnalyzeWithAi()}
              className="rounded-xl border border-emerald-500/40 bg-emerald-600/15 px-4 py-3 text-left transition hover:border-emerald-500/60 hover:bg-emerald-600/25"
            >
              <span className="block text-sm font-semibold text-emerald-100">
                {analyzeCopied ? "Copied ✓" : "Analyze with AI"}
              </span>
              <span className="mt-0.5 block text-xs text-emerald-200/70">
                One package — Mechanics · MTAE · dossier · Scout
              </span>
            </button>
            <button
              type="button"
              onClick={() => openPanel({ step: "apply" })}
              className="rounded-xl border border-violet-500/40 bg-violet-600/15 px-4 py-3 text-left transition hover:border-violet-500/60 hover:bg-violet-600/25"
            >
              <span className="block text-sm font-semibold text-violet-100">Apply AI Result</span>
              <span className="mt-0.5 block text-xs text-violet-200/70">
                Paste → Validate → Accept
              </span>
            </button>
            <Link
              href={scoutHref}
              className="rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-left transition hover:border-zinc-500 hover:bg-zinc-900"
            >
              <span className="block text-sm font-semibold text-zinc-100">Open Scout</span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                Decision · entry · stop · targets · R
              </span>
            </Link>
          </div>

          {primaryPlan ? (
            <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Active scout
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Link
                  href={`/planning?plan=${primaryPlan.id}`}
                  className="font-medium text-violet-400 hover:text-violet-300"
                >
                  {primaryPlan.id}
                </Link>
                {primaryPlan.decision ? (
                  <span className="rounded-full border border-violet-500/30 px-2 py-0.5 text-xs text-violet-300">
                    {DECISION_VERDICT_LABELS[primaryPlan.decision.verdict]} ·{" "}
                    {primaryPlan.decision.decisionConfidence}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-500">No decision yet</span>
                )}
              </div>
              <dl className="mt-3 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-zinc-600">Entry</dt>
                  <dd className="font-medium text-zinc-200">
                    {primaryPlan.plannedEntry !== undefined
                      ? `$${primaryPlan.plannedEntry}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-600">Stop</dt>
                  <dd className="font-medium text-zinc-200">
                    {primaryPlan.stopPrice !== undefined ? `$${primaryPlan.stopPrice}` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-600">Target</dt>
                  <dd className="font-medium text-zinc-200">
                    {primaryPlan.targetPrice !== undefined
                      ? `$${primaryPlan.targetPrice}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-600">Planned R</dt>
                  <dd className="font-medium text-emerald-400">
                    {levelsView.plannedRR !== undefined
                      ? `${levelsView.plannedRR.toFixed(1)}R`
                      : primaryPlan.plannedRR !== undefined
                        ? `${primaryPlan.plannedRR.toFixed(1)}R`
                        : "—"}
                  </dd>
                </div>
              </dl>
              {primaryPlan.decision?.reasoning ? (
                <p className="mt-2 text-xs text-zinc-500 line-clamp-2">
                  {primaryPlan.decision.reasoning}
                </p>
              ) : null}
              {activePlans.length > 1 ? (
                <ul className="mt-3 space-y-1 border-t border-zinc-800 pt-2 text-xs text-zinc-500">
                  {activePlans.slice(1).map((plan) => (
                    <li key={plan.id}>
                      <Link
                        href={`/planning?plan=${plan.id}`}
                        className="text-violet-400 hover:underline"
                      >
                        {plan.id}
                      </Link>
                      {plan.decision
                        ? ` · ${DECISION_VERDICT_LABELS[plan.decision.verdict]}`
                        : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-zinc-700 px-4 py-3 text-sm text-zinc-500">
              No active scout — Analyze with AI can propose{" "}
              <code className="text-zinc-400">scout-plan-create</code> after technical Accept.
            </div>
          )}

          <div className="mt-3">
            <FamilyBChecklist playbookId={primaryPlan?.playbookId} compact />
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-300"
            >
              {advancedOpen ? "Hide advanced ▴" : "Advanced · History · System ▾"}
            </button>
            {advancedOpen ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <SnapshotButton
                  title={snapshotButtonTitle(thesis.ticker, "snapshot")}
                  description="Thesis, levels, evidence, linked scouts"
                  items={snapshotItems}
                />
                <form action={createAiAccessLink}>
                  <input type="hidden" name="stockProfileId" value={thesis.id} />
                  <button
                    type="submit"
                    disabled={grantPending}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-50"
                  >
                    {grantPending ? "Creating…" : "Create AI access link"}
                  </button>
                </form>
              </div>
            ) : null}
          </div>

          {grantError ? <p className="mt-3 text-sm text-red-400">{grantError}</p> : null}
          {grantLinks ? (
            <div className="mt-3 rounded-xl border border-violet-500/30 bg-violet-950/20 p-4 text-sm">
              <p className="font-medium text-violet-200">AI access link · expires {formatTimestamp(grantLinks.expiresAt)}</p>
              <p className="mt-2 text-xs text-zinc-400">
                Share the human page or paste the context URL into your AI assistant.
              </p>
              <dl className="mt-3 space-y-2 text-xs">
                <div>
                  <dt className="text-zinc-500">Human page</dt>
                  <dd>
                    <a
                      href={grantLinks.humanPageUrl}
                      className="break-all text-violet-300 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {grantLinks.humanPageUrl}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Context API</dt>
                  <dd className="break-all font-mono text-zinc-400">{grantLinks.contextUrl}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Inbox API</dt>
                  <dd className="break-all font-mono text-zinc-400">{grantLinks.inboxUrl}</dd>
                </div>
              </dl>
            </div>
          ) : null}

          <nav className="mt-4 flex gap-2">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  tab === item.id
                    ? "bg-violet-600 text-white"
                    : "border border-zinc-700 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        <div className="space-y-4 px-4 py-4 lg:px-6">
          {tab === "snapshot" ? (
            <>
              {synthesis ? (
                <section className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-5">
                  <h2 className="text-sm font-semibold text-zinc-200">Synthesis</h2>
                  <p className="mt-2 text-sm text-violet-200">{synthesis.synthesisSummary}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {synthesis.evidenceCount} active evidence · generated{" "}
                    {formatTimestamp(synthesis.generatedAt)}
                  </p>
                </section>
              ) : null}

              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                <h2 className="text-sm font-semibold text-zinc-200">Thesis</h2>
                <p className="mt-2 text-sm text-zinc-400">{thesis.thesis}</p>
              </section>

              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                <h2 className="text-sm font-semibold text-zinc-200">Current hypothesis</h2>
                <p className="mt-2 text-sm text-violet-300">{thesis.currentHypothesis}</p>
              </section>

              <MtaeEvidenceFirstPanel
                assessment={latestMtaeAssessment}
                profileNotes={thesis.notes ?? thesis.thesis}
              />

              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-200">Plan map</h2>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      <PlanMapSummaryLine view={levelsView} />
                    </p>
                  </div>
                  <PlanMapToggleButton
                    open={planMapOpen}
                    onClick={() => setPlanMapOpen((v) => !v)}
                    view={levelsView}
                  />
                </div>
                {planMapOpen ? (
                  <div className="mt-4 border-t border-zinc-800 pt-4">
                    <PlanLevelsBoard view={levelsView} />
                  </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                <h2 className="text-sm font-semibold text-zinc-200">Levels (raw)</h2>
                <div className="mt-3 grid gap-3 text-sm text-zinc-400 sm:grid-cols-2 lg:grid-cols-3">
                  <p>Major support: {formatLevel(levels.majorSupport)}</p>
                  <p>Major resistance: {formatLevel(levels.majorResistance)}</p>
                  <p>Primary zone: {formatStockThesisZone(levels.primaryZone)}</p>
                  <p>Secondary zone: {formatStockThesisZone(levels.secondaryZone)}</p>
                  <p>
                    Targets:{" "}
                    {levels.targets?.length
                      ? levels.targets.map((t) => formatLevel(t)).join(", ")
                      : "—"}
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                <h2 className="text-sm font-semibold text-zinc-200">Risk rules</h2>
                <div className="mt-3 space-y-2 text-sm text-zinc-400">
                  <p>Minimum R:R: {thesis.riskRules.minimumRR}R</p>
                  <p>Invalidation: {thesis.riskRules.invalidation}</p>
                  {thesis.riskRules.notes ? <p>Notes: {thesis.riskRules.notes}</p> : null}
                </div>
              </section>

              <section className="rounded-2xl border border-violet-500/30 bg-zinc-900/80 p-5">
                <h2 className="text-sm font-semibold text-zinc-200">Edit (MVP)</h2>
                <form action={submitForm} className="mt-4 space-y-4">
                  <input type="hidden" name="id" value={thesis.id} />

                  <label className="block text-xs text-zinc-500">
                    Status
                    <select
                      name="status"
                      defaultValue={thesis.status}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    >
                      {(Object.keys(STOCK_THESIS_STATUS_LABELS) as StockThesisStatus[]).map((key) => (
                        <option key={key} value={key}>
                          {STOCK_THESIS_STATUS_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs text-zinc-500">
                    Current hypothesis
                    <textarea
                      name="currentHypothesis"
                      rows={3}
                      defaultValue={thesis.currentHypothesis}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    />
                  </label>

                  <label className="block text-xs text-zinc-500">
                    Notes
                    <textarea
                      name="notes"
                      rows={3}
                      defaultValue={thesis.notes ?? ""}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                    />
                  </label>

                  {formError ? <p className="text-sm text-red-400">{formError}</p> : null}

                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    Save changes
                  </button>
                </form>
              </section>
            </>
          ) : null}

          {tab === "evidence" ? (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h2 className="text-sm font-semibold text-zinc-200">Active evidence</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Append-only stream. Propose new rows via AI Block or scoped access link.
              </p>
              {activeEvidence.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">No active evidence yet.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {activeEvidence.map((row) => (
                    <li
                      key={row.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        <span className="font-mono text-zinc-400">{row.id}</span>
                        <span>{row.timeframe}</span>
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">
                          {row.category}
                        </span>
                        <span>conf {row.confidence}</span>
                        <span>{row.source}</span>
                        <span>{formatTimestamp(row.observedAt)}</span>
                      </div>
                      <p className="mt-2 text-zinc-300">{row.value}</p>
                      {row.note ? <p className="mt-1 text-xs text-zinc-500">{row.note}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {tab === "history" ? (
            <>
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                <h2 className="text-sm font-semibold text-zinc-200">Historical analysis (fixture)</h2>
                {thesis.historicalAnalysis.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500">No historical analysis recorded.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {thesis.historicalAnalysis.map((row) => (
                      <li key={row.timeframe} className="text-sm text-zinc-400">
                        <span className="font-medium text-zinc-300">{row.timeframe}</span>
                        <span className="text-zinc-600"> · </span>
                        {row.summary}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                <h2 className="text-sm font-semibold text-zinc-200">Annotations & assessments</h2>
                {thesis.notes?.trim() ? (
                  <pre className="mt-3 whitespace-pre-wrap text-sm text-zinc-400">{thesis.notes}</pre>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500">
                    Scout assessments and notes append here via inbox Apply.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                <h2 className="text-sm font-semibold text-zinc-200">Version</h2>
                <p className="mt-2 text-sm text-zinc-400">Profile version {thesis.version}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Updated {formatTimestamp(thesis.updatedAt)}
                </p>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
