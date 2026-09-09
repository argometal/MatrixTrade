"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FocusedCaseReport } from "@/lib/focused-case-report";
import type { InsightsCaseRow } from "@/lib/insights-case-spine-types";
import type { ThesisCase } from "@/lib/thesis-case-types";
import type { MarketRealityViewModel } from "@/lib/market-reality-types";
import type { ExAnteLegacyPacket } from "@/lib/market-reality";
import type { CaseEvaluation } from "@/lib/case-evaluation-types";
import { mxtPath } from "@/lib/mxt-paths";
import { MarketRealityPanel } from "@/app/components/case-review/MarketRealityPanel";

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="grid gap-0.5 sm:grid-cols-[10rem_1fr] sm:gap-3">
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-200 whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

function formatMaybeNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return Number(value.toFixed(4)).toString();
}

function formatMaybeR(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}R`;
}

function formatMaybeDurationMs(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value < 0) return "—";
  const totalMinutes = Math.round(value / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(" ");
}

function T0EvidencePanel({ c }: { c: ThesisCase }) {
  const { t0Evidence, temporalIntegrity } = c;
  if (!t0Evidence.available) {
    return (
      <div className="rounded border border-amber-800/60 bg-amber-950/30 p-4 text-sm text-amber-100">
        <p className="font-medium">T0 evidence unavailable</p>
        <p className="mt-1 text-amber-200/90">
          {t0Evidence.reason ??
            "Historical T0 freeze insufficient for decision-time reconstruction."}
        </p>
        <p className="mt-2 text-xs text-amber-200/70">
          Confidence: {t0Evidence.integrity.toUpperCase()}. Current Stock File is
          not used to fabricate T0.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {t0Evidence.integrity === "partial" && (
        <div className="rounded border border-amber-700/50 bg-amber-950/20 px-3 py-2 text-xs text-amber-100">
          PARTIAL reconstruction — only fields preserved at T0 are shown.
          {!temporalIntegrity.t0VerifiedForReconstruction
            ? " Not verified for strict reconstruction."
            : ""}
        </div>
      )}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Thesis at decision time
        </h3>
        <dl className="space-y-2">
          <Field label="Thesis" value={t0Evidence.preEvent?.thesis} />
          <Field
            label="Hypothesis"
            value={t0Evidence.preEvent?.currentHypothesis}
          />
          <Field
            label="Levels"
            value={
              t0Evidence.preEvent?.levels
                ? JSON.stringify(t0Evidence.preEvent.levels, null, 2)
                : null
            }
          />
          <Field
            label="Risk / invalidation"
            value={
              t0Evidence.preEvent?.riskRules
                ? JSON.stringify(t0Evidence.preEvent.riskRules, null, 2)
                : null
            }
          />
          <Field
            label="Stock version @ T0"
            value={t0Evidence.preEvent?.stockThesisVersion}
          />
        </dl>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Plan
        </h3>
        <dl className="space-y-2">
          <Field label="Plan" value={t0Evidence.plan?.planId} />
          <Field
            label="Executable entry"
            value={t0Evidence.plan?.plannedEntry}
          />
          <Field
            label="Original entry"
            value={t0Evidence.plan?.originalEntry}
          />
          <Field label="Max entry" value={t0Evidence.plan?.maximumEntryProxy} />
          <Field label="Stop" value={t0Evidence.plan?.stopPrice} />
          <Field label="Target" value={t0Evidence.plan?.targetPrice} />
          <Field label="Planned RR" value={t0Evidence.plan?.plannedRR} />
          <Field
            label="Blocks participation"
            value={t0Evidence.plan?.participationBlocker}
          />
          <Field
            label="Revise if"
            value={
              t0Evidence.plan?.reviseIf?.length
                ? t0Evidence.plan.reviseIf.join("\n")
                : null
            }
          />
          <Field
            label="Execution instruction"
            value={t0Evidence.plan?.executionInstruction}
          />
          <Field
            label="Layers"
            value={
              t0Evidence.plan?.layeredEntry
                ? JSON.stringify(t0Evidence.plan.layeredEntry, null, 2)
                : null
            }
          />
        </dl>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Decision
        </h3>
        <dl className="space-y-2">
          <Field label="Verdict" value={t0Evidence.decision?.verdict} />
          <Field label="Decided at" value={t0Evidence.decision?.decidedAt} />
          <Field label="Reasoning" value={t0Evidence.decision?.reasoning} />
          <Field
            label="Challenges"
            value={
              t0Evidence.decision?.challenges?.length
                ? t0Evidence.decision.challenges.join("\n")
                : null
            }
          />
          <Field
            label="Confidence"
            value={t0Evidence.decision?.decisionConfidence}
          />
          <Field
            label="Opportunity Q"
            value={t0Evidence.decision?.opportunityQuality}
          />
          <Field
            label="Thesis Q"
            value={t0Evidence.decision?.thesisQuality}
          />
          <Field
            label="Location evidence"
            value={t0Evidence.decision?.locationEvidence}
          />
          <Field
            label="Confirmation evidence"
            value={t0Evidence.decision?.confirmationEvidence}
          />
          <Field
            label="Planning risk"
            value={
              t0Evidence.decision?.planningRisk
                ? JSON.stringify(t0Evidence.decision.planningRisk, null, 2)
                : null
            }
          />
          <Field
            label="Execution risk"
            value={
              t0Evidence.decision?.executionRisk
                ? JSON.stringify(t0Evidence.decision.executionRisk, null, 2)
                : null
            }
          />
        </dl>
      </section>
    </div>
  );
}

function RealityPanel({ c }: { c: ThesisCase }) {
  const { postDecision, identity } = c;
  const mr = postDecision.marketReality;

  return (
    <div className="space-y-4">
      <dl className="space-y-2">
        <Field label="Completeness" value={mr.completeness} />
        <Field label="Horizon expired" value={String(mr.horizonExpired)} />
        <Field
          label="Episode"
          value={`${identity.episodeStatus}${identity.t1 ? ` · T1 ${identity.t1}` : ""}`}
        />
      </dl>
      {mr.observations.length > 0 ? (
        <ul className="space-y-2 text-sm text-zinc-300">
          {mr.observations.map((o) => (
            <li key={o.id} className="rounded border border-zinc-800 px-3 py-2">
              <div className="text-xs text-zinc-500">{o.id}</div>
              <div>
                {o.status}
                {o.observedAfterT0 ? " · after T0" : " · ≤ T0"}
              </div>
              {(o.maxPrice != null || o.minPrice != null) && (
                <div>
                  range {o.minPrice ?? "—"} … {o.maxPrice ?? "—"}
                </div>
              )}
              {o.firstTerminalEvent && (
                <div>terminal: {o.firstTerminalEvent}</div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">
          No canonical observation records for this case.
        </p>
      )}
    </div>
  );
}

function OutcomePanel({ c }: { c: ThesisCase }) {
  const { postDecision } = c;
  const ex = postDecision.execution;

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Execution
        </h3>
        {ex.kind === "no_trade" ? (
          <dl className="space-y-2">
            <Field label="State" value={ex.disposition} />
            <Field label="Scout verdict" value={ex.scoutVerdict} />
            <Field label="Plan status" value={ex.planStatus} />
          </dl>
        ) : (
          <dl className="space-y-2">
            <Field label="Trade" value={ex.tradeId} />
            <Field label="Status" value={ex.status} />
            <Field label="Entry" value={ex.entry} />
            <Field label="Exit" value={ex.exit} />
            <Field label="Stop" value={ex.stop} />
            <Field label="Target" value={ex.target} />
            <Field label="Closed" value={ex.closedAt} />
            <Field label="Exit reason" value={ex.exitReason} />
            <Field label="Actual R" value={ex.riskRewardActual} />
          </dl>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Result (canonical — not scored)
        </h3>
        <dl className="space-y-2">
          <Field
            label="Plan outcome"
            value={
              postDecision.outcome.planOutcome
                ? JSON.stringify(postDecision.outcome.planOutcome, null, 2)
                : "—"
            }
          />
          <Field
            label="Trade reviewed"
            value={postDecision.outcome.tradeReviewedAt}
          />
          <Field
            label="Trade lesson"
            value={postDecision.outcome.tradeLesson}
          />
        </dl>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Learning evidence
        </h3>
        <dl className="space-y-2">
          <Field
            label="Learning outcome"
            value={
              postDecision.learningEvidence.learningOutcome
                ? `${postDecision.learningEvidence.learningOutcome.id} · ${postDecision.learningEvidence.learningOutcome.kind}`
                : "—"
            }
          />
          <Field
            label="MAF"
            value={
              postDecision.learningEvidence.mafExperiment
                ? postDecision.learningEvidence.mafExperiment.id
                : "—"
            }
          />
          <Field
            label="Later decisions"
            value={
              postDecision.learningEvidence.laterDecisions.length
                ? postDecision.learningEvidence.laterDecisions
                    .map((d) => `${d.decidedAt} ${d.verdict}`)
                    .join("\n")
                : "—"
            }
          />
        </dl>
      </section>
    </div>
  );
}

function EvaluationPanel({ e }: { e: CaseEvaluation }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Four independent lanes. Outcome never sets Decision Quality. Non-INDETERMINATE
        conclusions show T0 → Reality evidence.
      </p>
      <dl className="space-y-3">
        <Field label="Decision Quality" value={e.decisionQuality.value} />
        <Field
          label="Decision evidence"
          value={
            e.decisionQuality.evidence.length
              ? e.decisionQuality.evidence
                  .map(
                    (x) =>
                      `T0: ${x.t0Ref}\nReality: ${x.realityRef}\n→ ${x.note}`
                  )
                  .join("\n\n")
              : null
          }
        />
        <Field label="Execution Quality" value={e.executionQuality.value} />
        <Field
          label="Execution evidence"
          value={
            e.executionQuality.evidence.length
              ? e.executionQuality.evidence
                  .map(
                    (x) =>
                      `T0: ${x.t0Ref}\nReality: ${x.realityRef}\n→ ${x.note}`
                  )
                  .join("\n\n")
              : null
          }
        />
        <Field
          label="Reality Relationship"
          value={e.realityRelationship.value}
        />
        <Field
          label="Reality evidence"
          value={
            e.realityRelationship.evidence.length
              ? e.realityRelationship.evidence
                  .map(
                    (x) =>
                      `T0: ${x.t0Ref}\nReality: ${x.realityRef}\n→ ${x.note}`
                  )
                  .join("\n\n")
              : null
          }
        />
        <Field
          label="Outcome (facts)"
          value={e.outcome.facts.join("\n")}
        />
      </dl>
      {e.uncertainty.length > 0 ? (
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500">
            Uncertainty
          </p>
          <ul className="list-disc space-y-1 pl-4 text-xs text-zinc-400">
            {e.uncertainty.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function OpportunityPathPanel({
  report,
}: {
  report: FocusedCaseReport;
}) {
  const path = report.opportunityConsumption;
  if (!path.available) {
    return (
      <p className="text-sm text-zinc-500">
        {path.reason ?? "Opportunity path is not available for this Case."}
      </p>
    );
  }

  return (
    <div className="space-y-4" data-case-opportunity-path>
      <dl className="space-y-2">
        <Field label="Planned risk" value={formatMaybeNumber(path.plannedRiskPrice)} />
        <Field
          label="Favorable displacement"
          value={
            path.favorableDisplacementR == null
              ? formatMaybeNumber(path.favorableDisplacementPrice)
              : `${formatMaybeNumber(path.favorableDisplacementPrice)} (${formatMaybeR(
                  path.favorableDisplacementR
                )} from original frozen risk)`
          }
        />
        <Field
          label="Peak after decision"
          value={
            path.maxFavorablePrice == null
              ? null
              : `${formatMaybeNumber(path.maxFavorablePrice)}${
                  path.maxFavorableAt ? ` @ ${path.maxFavorableAt}` : ""
                }`
          }
        />
        <Field
          label="Pullback after peak"
          value={
            path.subsequentPullbackPrice == null
              ? null
              : `${formatMaybeNumber(path.subsequentPullbackPrice)} (${formatMaybeR(
                  path.subsequentPullbackR
                )})`
          }
        />
        <Field
          label="Retested original entry"
          value={
            path.retestedOriginalEntryAfterPeak == null
              ? null
              : path.retestedOriginalEntryAfterPeak
                ? "yes"
                : "no"
          }
        />
        <Field
          label="Restored R:R on deepest pullback"
          value={formatMaybeR(path.restoredRRAtDeepestPullback)}
        />
        <Field
          label="Late-entry geometry"
          value={`${path.lateEntryGeometryAvailable ? "available" : "unavailable"}${
            path.lateEntryGeometryReason ? ` · ${path.lateEntryGeometryReason}` : ""
          }`}
        />
      </dl>

      {path.checkpoints.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-800 text-[10px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Checkpoint</th>
                <th className="px-3 py-2 font-medium">Reached</th>
                <th className="px-3 py-2 font-medium">After crossing</th>
                <th className="px-3 py-2 font-medium">Pullback / retest</th>
                <th className="px-3 py-2 font-medium">After path</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {path.checkpoints.map((checkpoint) => (
                <tr
                  key={checkpoint.thresholdR}
                  className="bg-zinc-950/40"
                  data-case-opportunity-checkpoint={checkpoint.thresholdR}
                >
                  <td className="px-3 py-2 text-zinc-100">
                    {formatMaybeR(checkpoint.thresholdR)} at{" "}
                    {formatMaybeNumber(checkpoint.thresholdPrice)}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">
                    {checkpoint.reached ? `yes · ${checkpoint.reachedAt ?? "—"}` : "no"}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">
                    {checkpoint.subsequentMfeR == null && checkpoint.subsequentMaeR == null
                      ? "—"
                      : `MFE ${formatMaybeR(checkpoint.subsequentMfeR)} · MAE ${formatMaybeR(
                          checkpoint.subsequentMaeR
                        )}`}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">
                    {checkpoint.pullbackDepthR == null
                      ? checkpoint.retestedOriginalEntry == null
                        ? "—"
                        : checkpoint.retestedOriginalEntry
                          ? "retested original entry"
                          : "no retest observed"
                      : `${formatMaybeR(checkpoint.pullbackDepthR)} · ${
                          checkpoint.retestedOriginalEntry == null
                            ? "retest —"
                            : checkpoint.retestedOriginalEntry
                              ? "retest yes"
                              : "retest no"
                        } · ${formatMaybeDurationMs(checkpoint.timeToDeepestPullbackMs)}`}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">
                    target{" "}
                    {checkpoint.targetReachedAfterThreshold == null
                      ? "—"
                      : checkpoint.targetReachedAfterThreshold
                        ? "yes"
                        : "no"}
                    {" · "}
                    stop{" "}
                    {checkpoint.stopReachedAfterThreshold == null
                      ? "—"
                      : checkpoint.stopReachedAfterThreshold
                        ? "yes"
                        : "no"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="text-xs text-zinc-500">
        Observational only. Opportunity Path describes what happened after the original
        decision. It does not imply late-entry geometry, recommendations, or attribution.
      </p>
      {path.checkpointOrderingLimitation ? (
        <p className="text-xs text-zinc-500">
          Resolution note: {path.checkpointOrderingLimitation}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Case review — T0, Reality, Outcome, Evaluation all visible when possessed.
 * No Blind/Reveal ceremony. T0 is never rewritten from live Stock File.
 */
export function CaseReviewClient({
  thesisCase,
  focusedCaseReport,
  marketReality,
  evaluation,
  caseSpine,
}: {
  thesisCase: ThesisCase;
  focusedCaseReport: FocusedCaseReport | null;
  marketReality: {
    exAnte: ExAnteLegacyPacket | null;
    primary: MarketRealityViewModel;
    retrospective: MarketRealityViewModel;
    errors: string[];
  } | null;
  evaluation: CaseEvaluation;
  caseSpine: InsightsCaseRow[];
}) {
  const c = thesisCase;
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const [snapshotCopied, setSnapshotCopied] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [snapshotPreview, setSnapshotPreview] = useState<string | null>(null);
  const thesisHref = c.identity.stockThesisId
    ? mxtPath(`/stock-theses/${c.identity.stockThesisId}`)
    : null;
  const scoutHref = mxtPath(
    `/scout?plan=${encodeURIComponent(c.identity.anchorPlanId)}`
  );
  const insightsHref = mxtPath(
    `/stats?tab=pipeline&case=${encodeURIComponent(c.identity.anchorPlanId)}`
  );
  const snapshotCaseId = useMemo(() => {
    const anchor = c.identity.anchorPlanId.trim().toUpperCase();
    return (
      caseSpine.find((row) => row.planId.trim().toUpperCase() === anchor)?.caseId ??
      c.identity.anchorPlanId
    );
  }, [c.identity.anchorPlanId, caseSpine]);

  async function copySnapshotForAi() {
    setSnapshotBusy(true);
    setSnapshotCopied(false);
    setSnapshotError(null);
    setSnapshotPreview(null);
    try {
      const res = await fetch(
        mxtPath(`/api/matrix/case-snapshot?case=${encodeURIComponent(snapshotCaseId)}`),
        { cache: "no-store" }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Snapshot request failed (${res.status})`);
      }
      const text = await res.text();
      try {
        await navigator.clipboard.writeText(text);
        setSnapshotCopied(true);
        window.setTimeout(() => setSnapshotCopied(false), 2000);
      } catch {
        setSnapshotPreview(text);
        setSnapshotError("Clipboard unavailable — selected Case Profile snapshot generated below for manual copy.");
      }
    } catch (error) {
      setSnapshotError(error instanceof Error ? error.message : "Snapshot copy failed");
    } finally {
      setSnapshotBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <header className="space-y-2 border-b border-zinc-800 pb-4">
        <p className="text-[11px] text-zinc-600">
          {thesisHref ? (
            <>
              <Link href={thesisHref} className="hover:text-zinc-400">
                Stock Thesis
              </Link>
              <span className="mx-1.5">→</span>
            </>
          ) : null}
          <Link href={scoutHref} className="hover:text-zinc-400">
            Scout
          </Link>
          <span className="mx-1.5">→</span>
          <span className="text-zinc-500">Plan / Case</span>
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-lg font-semibold text-zinc-100">Plan / Case</h1>
          <div className="flex flex-wrap gap-3 text-sm">
            <button
              type="button"
              onClick={() => void copySnapshotForAi()}
              disabled={snapshotBusy}
              className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-violet-200 hover:bg-violet-500/20 disabled:cursor-wait disabled:opacity-70"
            >
              {snapshotCopied
                ? "Copied Snapshot for AI"
                : snapshotBusy
                  ? "Copying Snapshot for AI…"
                  : "Copy Snapshot for AI"}
            </button>
            {thesisHref ? (
              <Link
                href={thesisHref}
                className="text-zinc-400 hover:text-zinc-200"
              >
                Stock Thesis
              </Link>
            ) : null}
            <Link href={scoutHref} className="text-zinc-400 hover:text-zinc-200">
              Back to Scout
            </Link>
            <Link href={insightsHref} className="text-zinc-400 hover:text-zinc-200">
              Focus in Insights
            </Link>
          </div>
        </div>
        <p className="text-sm text-zinc-400">
          What we believed · what happened · what we learn
        </p>
        <p className="text-xs text-zinc-500">
          {c.identity.ticker} · {c.identity.anchorPlanId}
          {c.identity.stockThesisId ? ` · ${c.identity.stockThesisId}` : ""}
        </p>
        <p className="text-xs text-zinc-500">
          Copy Snapshot for AI exports the selected Case Profile, not the surrounding related-case list.
        </p>
        {snapshotError ? (
          <p className="text-xs text-rose-400">{snapshotError}</p>
        ) : null}
        <dl className="grid gap-1 text-xs text-zinc-500 sm:grid-cols-2">
          <div>
            T0: {c.identity.t0 ?? "—"} ({c.temporalIntegrity.t0Source})
          </div>
          <div>
            Horizon:{" "}
            {c.identity.evaluationHorizonEndsAt
              ? `${c.identity.evaluationHorizonDays}d → ${c.identity.evaluationHorizonEndsAt}`
              : "—"}
          </div>
          <div>
            Confidence: {c.identity.confidence.toUpperCase()}
            {c.temporalIntegrity.t0VerifiedForReconstruction
              ? " · verified reconstruction"
              : ""}
          </div>
          <div>
            Status: {c.identity.episodeStatus}
            {c.identity.t1 ? ` · T1 ${c.identity.t1}` : ""}
          </div>
          <div className="sm:col-span-2">
            Plans:{" "}
            {c.identity.relatedPlanIds.join(" → ") || c.identity.anchorPlanId}
          </div>
        </dl>
      </header>

      {snapshotPreview ? (
        <section className="space-y-3 rounded-xl border border-violet-800/60 bg-violet-950/20 p-4">
          <div>
            <h2 className="text-sm font-medium text-violet-100">Case Profile Snapshot</h2>
            <p className="mt-1 text-xs text-violet-200/80">
              Clipboard unavailable in this browser context. Copy the generated snapshot for the selected Case Profile below.
            </p>
          </div>
          <textarea
            readOnly
            value={snapshotPreview}
            className="min-h-[20rem] w-full rounded-lg border border-violet-700/50 bg-zinc-950/80 p-3 font-mono text-xs leading-5 text-zinc-100"
          />
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-200">
          T0 / Original evidence
        </h2>
        <p className="text-xs text-zinc-500">
          What was known, believed, planned, and decided at decision time.
          Immutable freeze — not rewritten by later Reality.
        </p>
        <T0EvidencePanel c={c} />
      </section>

      <section className="space-y-3 border-t border-zinc-800 pt-6">
        <h2 className="text-sm font-medium text-zinc-200">Reality</h2>
        <p className="text-xs text-zinc-500">
          Observations and market evidence the system possesses for this Case.
        </p>
        <RealityPanel c={c} />
        {marketReality ? (
          <MarketRealityPanel
            exAnte={marketReality.exAnte}
            primary={marketReality.primary}
            retrospective={marketReality.retrospective}
            errors={marketReality.errors}
          />
        ) : null}
      </section>

      <section className="space-y-3 border-t border-zinc-800 pt-6">
        <h2 className="text-sm font-medium text-zinc-200">Outcome</h2>
        <p className="text-xs text-zinc-500">
          Execution / no-trade and canonical result evidence.
        </p>
        <OutcomePanel c={c} />
      </section>

      <section className="space-y-3 border-t border-zinc-800 pt-6">
        <h2 className="text-sm font-medium text-zinc-200">Opportunity Path</h2>
        <p className="text-xs text-zinc-500">
          What happened after the original decision under preserved Market Reality,
          using the existing frozen plan geometry where available.
        </p>
        {focusedCaseReport ? (
          <OpportunityPathPanel report={focusedCaseReport} />
        ) : (
          <p className="text-sm text-zinc-500">
            Opportunity path is unavailable for this Case.
          </p>
        )}
      </section>

      <section className="space-y-3 border-t border-zinc-800 pt-6">
        <h2 className="text-sm font-medium text-zinc-200">Evaluation</h2>
        <EvaluationPanel e={evaluation} />
      </section>
    </div>
  );
}
