import Link from "next/link";
import type { LearningOverview, LearningOverviewRow } from "@/lib/learning-overview-types";
import type {
  DecisionQuality,
  RealityRelationshipLane,
} from "@/lib/case-evaluation-types";

function pct(n: number, total: number): string {
  if (total <= 0) return "—";
  return `${((n / total) * 100).toFixed(1)}%`;
}

function LaneBars<T extends string>({
  counts,
  total,
  order,
  labels,
}: {
  counts: Record<T, number>;
  total: number;
  order: T[];
  labels: Record<T, string>;
}) {
  return (
    <div className="space-y-2">
      {order.map((key) => {
        const n = counts[key] ?? 0;
        const width = total > 0 ? Math.max((n / total) * 100, n > 0 ? 2 : 0) : 0;
        return (
          <div key={key} className="grid grid-cols-[8rem_1fr_3.5rem] items-center gap-2 text-sm">
            <span className="truncate text-zinc-400">{labels[key]}</span>
            <div className="h-2 overflow-hidden rounded bg-zinc-900">
              <div
                className="h-full rounded bg-zinc-500"
                style={{ width: `${width}%` }}
              />
            </div>
            <span className="text-right tabular-nums text-zinc-300">
              {n}
              <span className="ml-1 text-xs text-zinc-600">{pct(n, total)}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

const DQ_ORDER: DecisionQuality[] = [
  "supported",
  "weakly_supported",
  "not_supported",
  "INDETERMINATE",
];
const DQ_LABELS: Record<DecisionQuality, string> = {
  supported: "supported",
  weakly_supported: "weakly_supported",
  not_supported: "not_supported",
  INDETERMINATE: "INDETERMINATE",
};

const RR_ORDER: RealityRelationshipLane[] = [
  "invalidated",
  "condition_met",
  "condition_not_met",
  "mixed",
  "INDETERMINATE",
];
const RR_LABELS: Record<RealityRelationshipLane, string> = {
  invalidated: "invalidated",
  condition_met: "condition_met",
  condition_not_met: "condition_not_met",
  mixed: "mixed",
  INDETERMINATE: "INDETERMINATE",
};

function verdictBadge(verdict: string | null) {
  if (!verdict) return <span className="text-zinc-600">—</span>;
  const entry = verdict === "go";
  const noEntry = verdict === "wait" || verdict === "no";
  const cls = entry
    ? "border-emerald-700/60 text-emerald-300"
    : noEntry
      ? "border-amber-700/60 text-amber-300"
      : "border-zinc-700 text-zinc-300";
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-[11px] uppercase ${cls}`}>
      {verdict}
    </span>
  );
}

function diagnosisLabel(row: LearningOverviewRow): string {
  const d = row.diagnosis;
  if (!d) return "—";
  if (d.classification.kind === "no_entry") {
    if (d.classification.value === "GOOD_FILTER") return "Good Filter";
    if (d.classification.value === "OVER_OPTIMIZATION") return "Sobre-optimización";
    return "Indeterminada";
  }
  if (d.classification.kind === "entry_family") {
    if (d.classification.value === "INDETERMINATE") return "Entry · Indet.";
    return `Familia ${d.classification.value}`;
  }
  return "Indeterminada";
}

function conditionTone(
  code: LearningOverview["diagnosis"]["currentCondition"]["code"]
): string {
  switch (code) {
    case "POSSIBLE_OVER_FILTERING":
      return "border-amber-800/60 bg-amber-950/30 text-amber-100";
    case "INSUFFICIENT_EVIDENCE":
      return "border-violet-900/50 bg-violet-950/20 text-violet-100";
    case "FILTERING_DOMINANT_GOOD":
      return "border-emerald-900/50 bg-emerald-950/20 text-emerald-100";
    case "PARTICIPATING":
      return "border-sky-900/50 bg-sky-950/20 text-sky-100";
    default:
      return "border-zinc-800 bg-zinc-950/60 text-zinc-200";
  }
}

export function LearningOverviewView({ data }: { data: LearningOverview }) {
  const total = data.totalCases;
  const entryPct = pct(data.entryCases, total);
  const noEntryPct = pct(data.noEntryCases, total);
  const entryShare = total > 0 ? (data.entryCases / total) * 100 : 0;
  const noEntryShare = total > 0 ? (data.noEntryCases / total) * 100 : 0;
  const probeShare = total > 0 ? (data.probeCases / total) * 100 : 0;
  const dx = data.diagnosis;
  const ne = dx.noEntryUniverse;
  const ent = dx.entryUniverse;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-1 border-b border-zinc-800 pb-4">
        <h1 className="text-lg font-semibold text-zinc-100">Learning Overview</h1>
        <p className="text-sm text-zinc-500">
          From Decisions → Evidence → Evaluation → Diagnosis → Learning
        </p>
        <p className="text-xs text-zinc-600">
          Aggregate is read-only. Drill into Case Review for T0 → Reality → Evaluation
          evidence. Outcome never defines Decision Quality. Diagnosis is equation-based
          (016a), not narrative.
        </p>
      </header>

      {/* CONDICIÓN ACTUAL */}
      <section
        className={`rounded-lg border px-4 py-4 ${conditionTone(dx.currentCondition.code)}`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
          Condición Actual
        </p>
        <p className="mt-2 text-base font-medium leading-snug">
          {dx.currentCondition.statement}
        </p>
        <p className="mt-2 text-[11px] opacity-70">
          {dx.currentCondition.code} · {dx.falseVirtuousLoop.equationId}:{" "}
          {dx.falseVirtuousLoop.suspected
            ? "posible bucle falso-virtuoso"
            : "sin sospecha de bucle falso-virtuoso"}
        </p>
      </section>

      {/* Decision Universe */}
      <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
        <h2 className="text-sm font-medium text-zinc-200">Decision Universe</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Plans with a committed ScoutDecision. High no-entry rate alone is not evidence of
          failure.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="text-3xl font-semibold tabular-nums text-zinc-50">
              {total}
              <span className="ml-2 text-sm font-normal text-zinc-500">total cases</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <span className="text-emerald-400">
                Entry (go): {data.entryCases}{" "}
                <span className="text-zinc-500">({entryPct})</span>
              </span>
              <span className="text-amber-400">
                No-entry (wait/no): {data.noEntryCases}{" "}
                <span className="text-zinc-500">({noEntryPct})</span>
              </span>
              {data.probeCases > 0 ? (
                <span className="text-zinc-400">
                  Probe: {data.probeCases}{" "}
                  <span className="text-zinc-600">({pct(data.probeCases, total)})</span>
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex h-3 overflow-hidden rounded bg-zinc-900">
              <div
                className="h-full bg-emerald-600/80"
                style={{ width: `${entryShare}%` }}
                title={`Entry ${entryPct}`}
              />
              <div
                className="h-full bg-amber-600/70"
                style={{ width: `${noEntryShare}%` }}
                title={`No-entry ${noEntryPct}`}
              />
              <div
                className="h-full bg-zinc-600"
                style={{ width: `${probeShare}%` }}
                title={`Probe ${pct(data.probeCases, total)}`}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-600">
              Missing T0 / evidencia insuficiente: {data.missingT0Cases} (
              {pct(data.missingT0Cases, total)})
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Diagnosis 016a */}
        <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="text-sm font-medium text-zinc-200">Diagnóstico (016a)</h2>
          <p className="mt-1 text-xs text-zinc-500">
            No-entradas: {ne} · Entradas: {ent}. Clasificación por ecuación, no por P&amp;L.
          </p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-emerald-400">Good Filter</span>
              <span className="tabular-nums text-zinc-200">
                {dx.goodFilter}{" "}
                <span className="text-xs text-zinc-600">
                  ({pct(dx.goodFilter, ne)})
                </span>
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-amber-400">Sobre-optimización</span>
              <span className="tabular-nums text-zinc-200">
                {dx.overOptimization}{" "}
                <span className="text-xs text-zinc-600">
                  ({pct(dx.overOptimization, ne)})
                </span>
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-zinc-400">Indeterminada (no-entry)</span>
              <span className="tabular-nums text-zinc-200">
                {dx.indeterminateNoEntry}{" "}
                <span className="text-xs text-zinc-600">
                  ({pct(dx.indeterminateNoEntry, ne)})
                </span>
              </span>
            </div>
            <div className="border-t border-zinc-800 pt-3 text-xs text-zinc-500">
              Familias entrada — A {dx.entryFamilyA} ({pct(dx.entryFamilyA, ent)}) · C{" "}
              {dx.entryFamilyC} ({pct(dx.entryFamilyC, ent)}) · D {dx.entryFamilyD} (
              {pct(dx.entryFamilyD, ent)}) · Indet. {dx.entryFamilyIndeterminate}
            </div>
            <p className="text-[11px] text-zinc-600">
              A buenas entradas · B = filtrado (good/over/indet) · C válidas con pérdida · D
              fallos atribuibles
            </p>
          </div>
        </section>

        {/* Evaluation Summary — P04 vocabulary */}
        <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="text-sm font-medium text-zinc-200">Evaluation Summary</h2>
          <p className="mt-1 text-xs text-zinc-500">
            P04 lane counts. Quality evaluates the decision at T0 — not market result.
          </p>
          <div className="mt-4 space-y-5">
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">
                Decision Quality
              </p>
              <LaneBars
                counts={data.decisionQuality}
                total={total}
                order={DQ_ORDER}
                labels={DQ_LABELS}
              />
            </div>
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">
                Reality Relationship
              </p>
              <LaneBars
                counts={data.realityRelationship}
                total={total}
                order={RR_ORDER}
                labels={RR_LABELS}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Cases for Review */}
      <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium text-zinc-200">Casos Para Revisar</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Prioridad: missing T0, sobre-optimización, familia D, incertidumbre — no P&amp;L.
            </p>
          </div>
          <p className="text-xs text-zinc-600">
            Showing {data.casesForReview.length} of {total}
          </p>
        </div>

        {data.casesForReview.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No review priorities — universe empty or all cases lack uncertainty signals.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-3 font-medium">Case</th>
                  <th className="py-2 pr-3 font-medium">Decisión</th>
                  <th className="py-2 pr-3 font-medium">Diagnóstico</th>
                  <th className="py-2 pr-3 font-medium">Ecuación</th>
                  <th className="py-2 pr-3 font-medium">Reality</th>
                  <th className="py-2 font-medium">T0</th>
                </tr>
              </thead>
              <tbody>
                {data.casesForReview.map((row) => (
                  <tr
                    key={row.planId}
                    className="border-b border-zinc-900/80 text-zinc-300"
                  >
                    <td className="py-2.5 pr-3">
                      <Link
                        href={row.caseHref}
                        className="font-medium text-zinc-100 hover:underline"
                      >
                        {row.planId}
                      </Link>
                      <div className="text-xs text-zinc-500">
                        {row.ticker}
                        {row.stockThesisId ? ` · ${row.stockThesisId}` : ""}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">{verdictBadge(row.verdict)}</td>
                    <td className="py-2.5 pr-3 text-xs">{diagnosisLabel(row)}</td>
                    <td className="py-2.5 pr-3 font-mono text-[10px] text-zinc-500">
                      {row.diagnosis?.equationId ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-xs">{row.realityRelationship}</td>
                    <td className="py-2.5 text-xs text-zinc-500">
                      {row.t0Available ? row.t0Integrity : "unavailable"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.allCases.length > 0 ? (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300">
              Full universe ({data.allCases.length}) — evidencia / ecuación por caso
            </summary>
            <ul className="mt-2 space-y-2 text-xs text-zinc-400">
              {data.allCases.map((row) => (
                <li key={`all-${row.planId}`} className="rounded border border-zinc-900/80 p-2">
                  <Link href={row.caseHref} className="hover:text-zinc-200 hover:underline">
                    {row.planId}
                  </Link>
                  {" · "}
                  {row.ticker} · {row.verdict ?? "—"} · {diagnosisLabel(row)}
                  {row.diagnosis ? (
                    <div className="mt-1 text-[11px] text-zinc-600">
                      {row.diagnosis.equationId}: {row.diagnosis.reason}
                      {row.diagnosis.missingInputs.length
                        ? ` · missing: ${row.diagnosis.missingInputs.join(", ")}`
                        : ""}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        <p className="mt-4 text-[11px] text-zinc-600">
          T0 immutable · Verifiable evidence · Sin narrativa retrospectiva
        </p>
      </section>
    </div>
  );
}
