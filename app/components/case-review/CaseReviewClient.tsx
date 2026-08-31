"use client";

import Link from "next/link";
import type { ThesisCase } from "@/lib/thesis-case-types";
import type { MarketRealityViewModel } from "@/lib/market-reality-types";
import type { ExAnteLegacyPacket } from "@/lib/market-reality";
import type { EdgeDecomposition } from "@/lib/edge-decomposition-types";
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
          <Field label="Entry" value={t0Evidence.plan?.plannedEntry} />
          <Field label="Max entry" value={t0Evidence.plan?.maximumEntryProxy} />
          <Field label="Stop" value={t0Evidence.plan?.stopPrice} />
          <Field label="Target" value={t0Evidence.plan?.targetPrice} />
          <Field label="Planned RR" value={t0Evidence.plan?.plannedRR} />
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

function EvaluationPanel({ d }: { d: EdgeDecomposition }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Edge Decomposition — evidence organization only. No scores or quality
        labels.
      </p>
      <dl className="space-y-2">
        <Field
          label="Thesis evidence"
          value={`${d.thesis.evidenceAvailable} · reality ${d.thesis.realityRelationship}`}
        />
        <Field
          label="Controllable"
          value={`${d.controllable.evidenceAvailable} · verdict ${d.controllable.decision.verdict ?? "—"} · exec ${d.controllable.execution.kind}`}
        />
        <Field
          label="External / reality"
          value={`${d.externalConditions.evidenceAvailable} · obs ${d.externalConditions.variables.observationCount} · terminal ${d.externalConditions.variables.firstTerminalEvent ?? "—"}`}
        />
        <Field
          label="Outcome"
          value={`${d.outcome.evidenceAvailable} · ${d.outcome.variables.planOutcomeKind ?? d.outcome.variables.executionKind} · R ${d.outcome.variables.realizedResultR ?? d.outcome.variables.theoreticalResultR ?? "—"}`}
        />
      </dl>
      {d.uncertainty.reasons.length > 0 ? (
        <ul className="list-disc space-y-1 pl-4 text-xs text-zinc-400">
          {d.uncertainty.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
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
  marketReality,
  evaluation,
}: {
  thesisCase: ThesisCase;
  marketReality: {
    exAnte: ExAnteLegacyPacket | null;
    primary: MarketRealityViewModel;
    retrospective: MarketRealityViewModel;
    errors: string[];
  } | null;
  evaluation: EdgeDecomposition;
}) {
  const c = thesisCase;
  const thesisHref = c.identity.stockThesisId
    ? mxtPath(`/stock-theses/${c.identity.stockThesisId}`)
    : null;
  const scoutHref = mxtPath(
    `/scout?plan=${encodeURIComponent(c.identity.anchorPlanId)}`
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <header className="space-y-2 border-b border-zinc-800 pb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-lg font-semibold text-zinc-100">Case</h1>
          <div className="flex flex-wrap gap-3 text-sm">
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
          </div>
        </div>
        <p className="text-sm text-zinc-400">
          {c.identity.ticker} · {c.identity.anchorPlanId}
          {c.identity.stockThesisId ? ` · ${c.identity.stockThesisId}` : ""}
        </p>
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
        <h2 className="text-sm font-medium text-zinc-200">Evaluation</h2>
        <EvaluationPanel d={evaluation} />
      </section>
    </div>
  );
}
