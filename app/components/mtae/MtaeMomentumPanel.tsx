import type { MtaeAssessment, MtaeMomentumAssessment } from "@/lib/mtae-types";
import {
  formatExpansionLabel,
  formatMovementCharacterLine,
  MTAE_NOT_ASSESSED_LABEL,
} from "@/lib/mtae-momentum-format";

function MomentumBody({ momentum }: { momentum: MtaeMomentumAssessment | undefined }) {
  if (!momentum) {
    return <p className="mt-2 text-sm text-zinc-500">{MTAE_NOT_ASSESSED_LABEL}</p>;
  }
  return (
    <div className="mt-3 space-y-2 text-sm text-zinc-300">
      <p>
        Expansion:{" "}
        <span className="font-medium text-zinc-100">
          {formatExpansionLabel(momentum.expansionPotential)}
        </span>
        {" · "}
        State:{" "}
        <span className="font-medium text-zinc-100">
          {formatExpansionLabel(momentum.currentState)}
        </span>
      </p>
      <p>
        Scout implication:{" "}
        <span className="font-medium text-amber-200">
          {formatExpansionLabel(momentum.scoutImplication)}
        </span>
        {momentum.capitalEfficiencyConcern ? (
          <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-200">
            Capital efficiency concern
          </span>
        ) : null}
      </p>
      <p className="text-xs text-zinc-500">Confidence {momentum.confidence}</p>
      <ul className="list-disc space-y-1 pl-4 text-xs text-zinc-400">
        {momentum.rationale.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="text-[11px] text-zinc-600">
        Technical context only — does not invalidate structure and is not a Scout verdict.
      </p>
    </div>
  );
}

/** Stock File / assessment technical synthesis — Momentum / Expansion. */
export function MtaeMomentumPanel({
  assessment,
}: {
  assessment: MtaeAssessment | null | undefined;
}) {
  const momentum = assessment?.integrated.momentumAssessment;
  return (
    <section className="rounded-2xl border border-sky-500/25 bg-sky-950/15 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-200">Momentum / Expansion</h2>
        {assessment ? (
          <span className="text-[11px] text-zinc-500">
            {assessment.id}
            {assessment.asOfPrice !== undefined ? ` · spot ~${assessment.asOfPrice}` : ""}
          </span>
        ) : null}
      </div>
      {!assessment ? (
        <p className="mt-2 text-sm text-zinc-500">
          {MTAE_NOT_ASSESSED_LABEL} — run MTAE technical-assessment to populate.
        </p>
      ) : (
        <>
          <MomentumBody momentum={momentum} />
          <div className="mt-4 border-t border-zinc-800 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              Per-TF movement
            </p>
            <ul className="mt-2 space-y-1 text-xs text-zinc-400">
              {assessment.perTimeframe.map((tf) => (
                <li key={tf.timeframe}>
                  <span className="text-zinc-300">{tf.timeframe}</span>
                  {": "}
                  {formatMovementCharacterLine(tf.participation?.movementCharacter)}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
