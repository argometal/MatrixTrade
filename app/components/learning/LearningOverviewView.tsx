import Link from "next/link";
import type { LearningOverview } from "@/lib/learning-overview-types";
import type {
  DecisionQuality,
  ExecutionQuality,
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

const EQ_ORDER: ExecutionQuality[] = [
  "respected",
  "violated",
  "not_applicable",
  "INDETERMINATE",
];
const EQ_LABELS: Record<ExecutionQuality, string> = {
  respected: "respected",
  violated: "violated",
  not_applicable: "not_applicable",
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

export function LearningOverviewView({ data }: { data: LearningOverview }) {
  const total = data.totalCases;
  const entryPct = pct(data.entryCases, total);
  const noEntryPct = pct(data.noEntryCases, total);
  const entryShare = total > 0 ? (data.entryCases / total) * 100 : 0;
  const noEntryShare = total > 0 ? (data.noEntryCases / total) * 100 : 0;
  const probeShare = total > 0 ? (data.probeCases / total) * 100 : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-1 border-b border-zinc-800 pb-4">
        <h1 className="text-lg font-semibold text-zinc-100">Learning Overview</h1>
        <p className="text-sm text-zinc-500">
          Decisions → Evidence → Evaluation → Learning
        </p>
        <p className="text-xs text-zinc-600">
          Aggregate is read-only. Drill into Case Review for T0 → Reality → Evaluation
          evidence. Outcome never defines Decision Quality. Counts describe the Case
          universe; they do not by themselves prove learning or decision quality.
        </p>
      </header>

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
              Missing T0 freeze: {data.missingT0Cases} (Evaluation Decision Quality =
              INDETERMINATE)
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
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
                Execution Quality
              </p>
              <LaneBars
                counts={data.executionQuality}
                total={total}
                order={EQ_ORDER}
                labels={EQ_LABELS}
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

        {/* No-entry Diagnosis — aggregator slot; UI does not classify */}
        <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="text-sm font-medium text-zinc-200">No-entry Diagnosis</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Universe: {data.noEntryDiagnosis.noEntryUniverse} no-entry cases
          </p>
          {data.noEntryDiagnosis.available === false ? (
            <div className="mt-6 rounded border border-amber-900/50 bg-amber-950/20 px-3 py-4 text-sm text-amber-100/90">
              <p className="font-medium">Diagnosis unavailable</p>
              <p className="mt-2 text-xs text-amber-200/80">
                {data.noEntryDiagnosis.reason}
              </p>
              <p className="mt-3 text-xs text-zinc-500">
                Speculative buckets (Good Filter / Possible Over-optimization /
                Families A–D) are not shown as facts. Future Case equations will
                populate this slot without redesigning the page.
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2 text-sm text-zinc-300">
              {Object.entries(data.noEntryDiagnosis.byLabel).map(([label, n]) => (
                <li key={label} className="flex justify-between gap-3">
                  <span className="text-zinc-400">{label}</span>
                  <span className="tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Cases for Review */}
      <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium text-zinc-200">Cases for Review</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Prioritized by missing T0, uncertainty, execution violation — not by P&amp;L.
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
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-3 font-medium">Case</th>
                  <th className="py-2 pr-3 font-medium">T0 decision</th>
                  <th className="py-2 pr-3 font-medium">Decision Q</th>
                  <th className="py-2 pr-3 font-medium">Execution</th>
                  <th className="py-2 pr-3 font-medium">Reality</th>
                  <th className="py-2 pr-3 font-medium">Uncertainty</th>
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
                    <td className="py-2.5 pr-3 text-xs">{row.decisionQuality}</td>
                    <td className="py-2.5 pr-3 text-xs">{row.executionQuality}</td>
                    <td className="py-2.5 pr-3 text-xs">{row.realityRelationship}</td>
                    <td className="py-2.5 pr-3 text-xs text-zinc-500">
                      {row.uncertainty.length
                        ? row.uncertainty[0]
                        : "—"}
                    </td>
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
              Full universe ({data.allCases.length}) — drill-down for aggregates
            </summary>
            <ul className="mt-2 space-y-1 text-xs text-zinc-400">
              {data.allCases.map((row) => (
                <li key={`all-${row.planId}`}>
                  <Link href={row.caseHref} className="hover:text-zinc-200 hover:underline">
                    {row.planId}
                  </Link>
                  {" · "}
                  {row.ticker} · {row.verdict ?? "—"} · DQ {row.decisionQuality} ·
                  Exec {row.executionQuality} · RR {row.realityRelationship}
                  {row.outcomeFacts[0] ? ` · ${row.outcomeFacts[0]}` : ""}
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        <p className="mt-4 text-[11px] text-zinc-600">
          T0 immutable · Verifiable evidence · No retrospective narrative
        </p>
      </section>
    </div>
  );
}
