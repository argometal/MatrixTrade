import type { MtaeAssessment } from "@/lib/mtae-types";
import {
  formatEvidenceFirstIntegrated,
  formatEvidenceFirstTimeframe,
  formatMomentumForUi,
} from "@/lib/mtae-evidence-format";
import { MTAE_NOT_ASSESSED_LABEL } from "@/lib/mtae-momentum-format";

/**
 * Default Stock File MTAE view — Evidence First.
 * Timeframes → Integrated → Profile Notes. No Scout capital language.
 */
export function MtaeEvidenceFirstPanel({
  assessment,
  profileNotes,
}: {
  assessment: MtaeAssessment | null | undefined;
  profileNotes?: string | null;
}) {
  if (!assessment) {
    return (
      <section className="rounded-2xl border border-sky-500/25 bg-sky-950/15 p-5">
        <h2 className="text-sm font-semibold text-zinc-200">Technical (MTAE)</h2>
        <p className="mt-2 text-sm text-zinc-500">
          {MTAE_NOT_ASSESSED_LABEL} — run technical-assessment. Evidence First layout
          (Supports → Resistances/Targets → Bias → Confidence per TF).
        </p>
      </section>
    );
  }

  const integrated = formatEvidenceFirstIntegrated(assessment);
  const momentumUi = formatMomentumForUi(assessment.integrated.momentumAssessment);
  const notes = String(profileNotes ?? "").trim();

  return (
    <section className="rounded-2xl border border-sky-500/25 bg-sky-950/15 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-200">Technical (MTAE) · Evidence First</h2>
        <span className="text-[11px] text-zinc-500">
          {assessment.id}
          {assessment.asOfPrice !== undefined ? ` · ~${assessment.asOfPrice}` : ""}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {assessment.perTimeframe.map((tf) => {
          const block = formatEvidenceFirstTimeframe(tf);
          return (
            <div
              key={tf.timeframe}
              className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {block.timeframe}
              </p>
              <dl className="mt-1.5 grid gap-1 text-sm text-zinc-300 sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] uppercase text-zinc-600">Supports</dt>
                  <dd className="tabular-nums text-zinc-100">{block.supports}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-zinc-600">Resistances / Targets</dt>
                  <dd className="tabular-nums text-zinc-100">{block.resistancesTargets}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-zinc-600">Bias</dt>
                  <dd className="capitalize text-zinc-100">{block.bias}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-zinc-600">Confidence</dt>
                  <dd className="tabular-nums text-zinc-100">{block.confidence}</dd>
                </div>
              </dl>
              {block.explanation ? (
                <p className="mt-1.5 text-[11px] text-zinc-500">{block.explanation}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-5 border-t border-zinc-800 pt-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Integrated
        </h3>
        <div className="mt-2 space-y-3 text-sm text-zinc-300">
          <div>
            <p className="text-[10px] uppercase text-zinc-600">Overall Technical Thesis</p>
            <p className="mt-0.5 text-zinc-100">{integrated.overallTechnicalThesis}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-zinc-600">
              Momentum Assessment · expansion quality
            </p>
            {!momentumUi ? (
              <p className="mt-0.5 text-zinc-500">{MTAE_NOT_ASSESSED_LABEL}</p>
            ) : (
              <div className="mt-1 space-y-1">
                <p className="text-zinc-100">
                  {momentumUi.expansion} · {momentumUi.state}
                  <span className="ml-2 text-xs text-zinc-500">
                    conf {momentumUi.confidence}
                  </span>
                  {momentumUi.concern ? (
                    <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-200">
                      Capital efficiency concern
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-amber-200/90">
                  Scout implication (context only): {momentumUi.implication}
                </p>
                <ul className="list-disc space-y-0.5 pl-4 text-xs text-zinc-500">
                  {momentumUi.rationale.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase text-zinc-600">Structural Risks</p>
            <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-zinc-300">
              {integrated.structuralRisks.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] uppercase text-zinc-600">Important Notes</p>
            <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-zinc-400">
              {integrated.importantNotes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-zinc-800 pt-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Profile Notes
        </h3>
        <p className="mt-1.5 text-xs text-zinc-500 whitespace-pre-wrap">
          {notes || "(none)"}
        </p>
        <p className="mt-3 text-[11px] text-zinc-600">
          Scout owns go / wait / no, entry optimization, sizing, and capital — not MTAE.
        </p>
      </div>
    </section>
  );
}
