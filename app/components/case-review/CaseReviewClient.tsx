"use client";

import { useState } from "react";
import Link from "next/link";
import type { ThesisCase } from "@/lib/thesis-case-types";
import type { MarketRealityViewModel } from "@/lib/market-reality-types";
import type { ExAnteLegacyPacket } from "@/lib/market-reality";
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

function BlindPanel({ c }: { c: ThesisCase }) {
  const { blind, temporalIntegrity } = c;
  if (!blind.available) {
    return (
      <div className="rounded border border-amber-800/60 bg-amber-950/30 p-4 text-sm text-amber-100">
        <p className="font-medium">Blind unavailable</p>
        <p className="mt-1 text-amber-200/90">
          {blind.reason ?? "Historical T0 freeze insufficient for strict Blind review."}
        </p>
        <p className="mt-2 text-xs text-amber-200/70">
          Confidence: {blind.integrity.toUpperCase()}. Current Stock File is not used to
          reconstruct T0.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {blind.integrity === "partial" && (
        <div className="rounded border border-amber-700/50 bg-amber-950/20 px-3 py-2 text-xs text-amber-100">
          PARTIAL reconstruction — only fields preserved at T0 are shown. Not safe for
          strict verified Blind review
          {temporalIntegrity.blindSafeForStrictReview ? "" : "."}
        </div>
      )}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Pre-event (T0)
        </h3>
        <dl className="space-y-2">
          <Field label="Thesis" value={blind.preEvent?.thesis} />
          <Field label="Hypothesis" value={blind.preEvent?.currentHypothesis} />
          <Field
            label="Levels"
            value={
              blind.preEvent?.levels
                ? JSON.stringify(blind.preEvent.levels, null, 2)
                : null
            }
          />
          <Field
            label="Risk / invalidation"
            value={
              blind.preEvent?.riskRules
                ? JSON.stringify(blind.preEvent.riskRules, null, 2)
                : null
            }
          />
          <Field
            label="Stock version @ T0"
            value={blind.preEvent?.stockThesisVersion}
          />
        </dl>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Plan geometry (T0)
        </h3>
        <dl className="space-y-2">
          <Field label="Plan" value={blind.plan?.planId} />
          <Field label="Entry" value={blind.plan?.plannedEntry} />
          <Field label="Max entry" value={blind.plan?.maximumEntryProxy} />
          <Field label="Stop" value={blind.plan?.stopPrice} />
          <Field label="Target" value={blind.plan?.targetPrice} />
          <Field label="Planned RR" value={blind.plan?.plannedRR} />
          <Field
            label="Execution instruction"
            value={blind.plan?.executionInstruction}
          />
          <Field
            label="Layers"
            value={
              blind.plan?.layeredEntry
                ? JSON.stringify(blind.plan.layeredEntry, null, 2)
                : null
            }
          />
        </dl>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Decision (T0)
        </h3>
        <dl className="space-y-2">
          <Field label="Verdict" value={blind.decision?.verdict} />
          <Field label="Decided at" value={blind.decision?.decidedAt} />
          <Field label="Reasoning" value={blind.decision?.reasoning} />
          <Field
            label="Challenges"
            value={
              blind.decision?.challenges?.length
                ? blind.decision.challenges.join("\n")
                : null
            }
          />
        </dl>
      </section>
    </div>
  );
}

function RevealPanel({ c }: { c: ThesisCase }) {
  const { reveal, identity } = c;
  const ex = reveal.execution;

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
          Market reality
        </h3>
        <dl className="space-y-2">
          <Field label="Completeness" value={reveal.marketReality.completeness} />
          <Field
            label="Horizon expired"
            value={String(reveal.marketReality.horizonExpired)}
          />
          <Field
            label="Episode"
            value={`${identity.episodeStatus}${identity.t1 ? ` · T1 ${identity.t1}` : ""}`}
          />
        </dl>
        {reveal.marketReality.observations.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm text-zinc-300">
            {reveal.marketReality.observations.map((o) => (
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
          <p className="mt-2 text-sm text-zinc-500">
            No canonical observation records for this case.
          </p>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Outcome (canonical — not scored)
        </h3>
        <dl className="space-y-2">
          <Field
            label="Plan outcome"
            value={
              reveal.outcome.planOutcome
                ? JSON.stringify(reveal.outcome.planOutcome, null, 2)
                : "—"
            }
          />
          <Field label="Trade reviewed" value={reveal.outcome.tradeReviewedAt} />
          <Field label="Trade lesson" value={reveal.outcome.tradeLesson} />
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
              reveal.learningEvidence.learningOutcome
                ? `${reveal.learningEvidence.learningOutcome.id} · ${reveal.learningEvidence.learningOutcome.kind}`
                : "—"
            }
          />
          <Field
            label="MAF"
            value={
              reveal.learningEvidence.mafExperiment
                ? reveal.learningEvidence.mafExperiment.id
                : "—"
            }
          />
          <Field
            label="Later decisions"
            value={
              reveal.learningEvidence.laterDecisions.length
                ? reveal.learningEvidence.laterDecisions
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

/**
 * Minimal Case review: Blind first; Reveal only after deliberate click.
 * Ephemeral UI state — Reveal click is not persisted.
 * Market Reality (OHLCV) is Reveal-only — never Blind.
 */
export function CaseReviewClient({
  thesisCase,
  marketReality,
}: {
  thesisCase: ThesisCase;
  marketReality: {
    exAnte: ExAnteLegacyPacket | null;
    primary: MarketRealityViewModel;
    retrospective: MarketRealityViewModel;
    errors: string[];
  } | null;
}) {
  const [revealed, setRevealed] = useState(false);
  const c = thesisCase;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="space-y-2 border-b border-zinc-800 pb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-lg font-semibold text-zinc-100">Case review</h1>
          <Link
            href={mxtPath(`/scout?plan=${encodeURIComponent(c.identity.anchorPlanId)}`)}
            className="text-sm text-zinc-400 hover:text-zinc-200"
          >
            Back to Scout
          </Link>
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
            {c.temporalIntegrity.blindSafeForStrictReview
              ? " · strict Blind OK"
              : ""}
          </div>
          <div>
            Status: {c.identity.episodeStatus}
            {c.identity.t1 ? ` · T1 ${c.identity.t1}` : ""}
          </div>
          <div className="sm:col-span-2">
            Plans: {c.identity.relatedPlanIds.join(" → ") || c.identity.anchorPlanId}
          </div>
        </dl>
      </header>

      {!revealed ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-zinc-200">
              Pass A — Blind (T0 only)
            </h2>
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
              Outcome hidden
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            Review what was knowable at T0. Post-event reality is withheld until you
            deliberately reveal.
          </p>
          <BlindPanel c={c} />
          <div className="border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="rounded border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 hover:border-zinc-400 hover:bg-zinc-800"
            >
              Reveal post-T0 reality
            </button>
            <p className="mt-2 text-xs text-zinc-600">
              Reveal is ephemeral — not saved as a review record.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-zinc-200">
                Pass A — Blind (T0 only)
              </h2>
              <button
                type="button"
                onClick={() => setRevealed(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Hide reveal
              </button>
            </div>
            <BlindPanel c={c} />
          </div>
          <div className="space-y-4 border-t border-zinc-700 pt-6">
            <h2 className="text-sm font-medium text-zinc-200">
              Pass B — Reveal (after T0)
            </h2>
            <p className="text-xs text-zinc-500">
              Evidence only — no automatic decision/outcome scoring.
            </p>
            <RevealPanel c={c} />
          </div>
          {marketReality && (
            <MarketRealityPanel
              exAnte={marketReality.exAnte}
              primary={marketReality.primary}
              retrospective={marketReality.retrospective}
              errors={marketReality.errors}
            />
          )}
        </div>
      )}
    </div>
  );
}
