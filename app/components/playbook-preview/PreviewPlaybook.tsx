import Link from "next/link";
import type { PlaybookStats } from "@/lib/analytics";
import { SnapshotButton } from "@/app/components/preview/SnapshotButton";
import {
  PLAYBOOK_STATUS_LABELS,
  PLAYBOOK_SCOUT_STATUS_LABELS,
  type Playbook,
  type PlaybookExecutionExperiments,
  type PlaybookMethodology,
  type PlaybookMultiTimeframeHierarchy,
  type PlaybookScoutStatistics,
} from "@/lib/playbook-types";
import type { SnapshotMenuItem } from "@/lib/snapshot-types";

function formatUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

function formatPct(value: number | null): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(0)}%`;
}

function formatR(value: number | null): string {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}R`;
}

function formatPf(value: number | null): string {
  if (value === null) return "—";
  if (value === Infinity) return "∞";
  return value.toFixed(2);
}

function pnlTone(value: number): string {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-zinc-200";
}

const statusStyles: Record<string, string> = {
  TESTING: "bg-amber-500/15 text-amber-400",
  ACTIVE: "bg-emerald-500/15 text-emerald-400",
  RETIRED: "bg-zinc-700/50 text-zinc-400",
};

const METHODOLOGY_SECTIONS: {
  key: keyof PlaybookMethodology;
  label: string;
}[] = [
  { key: "philosophy", label: "Philosophy" },
  { key: "corePrinciple", label: "Core principle" },
  { key: "asymmetryPrinciple", label: "Asymmetry" },
  { key: "confirmationCost", label: "Confirmation cost" },
  { key: "opportunityPreservation", label: "Opportunity preservation" },
  { key: "statisticalFramework", label: "Statistical framework" },
  { key: "continuousLearning", label: "Continuous learning" },
  { key: "matrixIdentity", label: "Matrix identity" },
];

function PlaybookExecutionPanel({ execution }: { execution: PlaybookExecutionExperiments }) {
  const blocks: { key: Exclude<keyof PlaybookExecutionExperiments, "metrics">; label: string }[] = [
    { key: "strategyDefinition", label: "Strategy (constant)" },
    { key: "executionDefinition", label: "Execution (variable)" },
    { key: "experimentalRule", label: "Experimental rule" },
    { key: "layeredEntryHypothesis", label: "Layered entry hypothesis" },
    { key: "executionPrinciple", label: "Execution principle" },
    { key: "noChaseRule", label: "No chase rule" },
  ];
  const sections = blocks.filter((b) => execution[b.key]?.trim());
  if (sections.length === 0 && !execution.metrics?.length) return null;

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-violet-500/20 bg-violet-950/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-400">
        Execution experiments
      </p>
      {sections.map(({ key, label }) => (
        <div key={key}>
          <p className="text-xs font-medium text-violet-300/90">{label}</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-300">{execution[key]}</p>
        </div>
      ))}
      {execution.metrics?.length ? (
        <p className="text-xs text-zinc-500">Metrics: {execution.metrics.join(" · ")}</p>
      ) : null}
    </div>
  );
}
function PlaybookMethodologyPanel({ methodology }: { methodology: PlaybookMethodology }) {
  const sections = METHODOLOGY_SECTIONS.filter((s) => methodology[s.key]?.trim());
  if (sections.length === 0) return null;

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-teal-500/20 bg-teal-950/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-400">
        Expectancy &amp; asymmetry framework
      </p>
      {sections.map(({ key, label }) => (
        <div key={key}>
          <p className="text-xs font-medium text-teal-300/90">{label}</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-300">{methodology[key]}</p>
        </div>
      ))}
    </div>
  );
}

function PlaybookMultiTimeframePanel({ hierarchy }: { hierarchy: PlaybookMultiTimeframeHierarchy }) {
  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-sky-500/20 bg-sky-950/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-400">
        Playbook experiment — multi-timeframe hierarchy
      </p>
      {hierarchy.experimentNote ? (
        <p className="text-xs leading-relaxed text-sky-200/80">{hierarchy.experimentNote}</p>
      ) : null}
      <div className="space-y-3">
        {hierarchy.grades.map((grade) => (
          <div key={grade.grade} className="rounded-lg bg-zinc-950/50 p-3">
            <p className="text-sm font-medium text-zinc-200">
              Grade {grade.grade} — {grade.label}{" "}
              <span className="font-normal text-zinc-500">({grade.horizon})</span>
            </p>
            <p className="mt-1 text-xs text-zinc-400">{grade.question}</p>
            {grade.outputs.length > 0 ? (
              <ul className="mt-2 space-y-0.5 text-xs text-zinc-500">
                {grade.outputs.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            ) : null}
            {grade.constraint ? (
              <p className="mt-2 text-xs font-medium text-sky-300/90">{grade.constraint}</p>
            ) : null}
          </div>
        ))}
      </div>
      {hierarchy.decisionRule ? (
        <p className="text-sm leading-relaxed text-zinc-300">
          <span className="font-medium text-sky-300">Decision rule:</span> {hierarchy.decisionRule}
        </p>
      ) : null}
      {hierarchy.importantRules.length > 0 ? (
        <ul className="space-y-1 text-xs text-zinc-400">
          {hierarchy.importantRules.map((rule) => (
            <li key={rule} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
              {rule}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PlaybookScoutStatisticsPanel({ stats }: { stats: PlaybookScoutStatistics }) {
  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
        Scout statistics (Playbook level)
      </p>
      {stats.purpose ? <p className="text-xs leading-relaxed text-zinc-400">{stats.purpose}</p> : null}
      {stats.statuses.length > 0 ? (
        <dl className="grid gap-2 sm:grid-cols-2">
          {stats.statuses.map((status) => (
            <div key={status} className="rounded-lg bg-zinc-950/50 p-3">
              <dt className="text-xs font-medium text-amber-300">
                {PLAYBOOK_SCOUT_STATUS_LABELS[status]}
              </dt>
              <dd className="mt-1 text-xs leading-relaxed text-zinc-500">
                {stats.statusDefinitions[status] ?? "—"}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {stats.missedDefinition ? (
        <p className="text-sm leading-relaxed text-zinc-300">
          <span className="font-medium text-amber-300">Missed:</span> {stats.missedDefinition}
        </p>
      ) : null}
      {stats.notTradesRule ? (
        <p className="text-xs font-medium text-amber-200/90">{stats.notTradesRule}</p>
      ) : null}
      {stats.metrics?.length ? (
        <p className="text-xs text-zinc-500">Metrics: {stats.metrics.join(" · ")}</p>
      ) : null}
    </div>
  );
}

export function PreviewPlaybook({
  stats,
  snapshotItems,
}: {
  stats: PlaybookStats[];
  snapshotItems: SnapshotMenuItem[];
}) {
  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <header className="border-b border-zinc-800 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">Playbook Lab</h1>
              <p className="mt-0.5 text-sm text-zinc-500">
                Strategy laboratory — assign trades manually, measure what works.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:mr-[11rem]">
              <SnapshotButton
                title="Playbook snapshot"
                description="Strategies, checklists, P/L and win rate per playbook"
                items={snapshotItems}
              />
              <Link
                href="/trades-preview"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
              >
                New trade
              </Link>
            </div>
          </div>
        </header>

        <div className="space-y-6 px-4 py-4 lg:px-6 lg:py-6">
          {stats.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No playbooks in{" "}
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                data/playbooks.json
              </code>
              . Add one to start testing strategies.
            </p>
          ) : (
            <div className="space-y-4">
              {stats.map((row) => {
                const name = row.playbook?.name ?? "Unassigned";
                const status = row.playbook?.status;
                const key = row.playbookId ?? "unassigned";

                return (
                  <article
                    key={key}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-zinc-100">{name}</h2>
                        {status && (
                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}
                          >
                            {PLAYBOOK_STATUS_LABELS[status]}
                          </span>
                        )}
                        {!row.playbook && (
                          <span className="mt-1 inline-block rounded-full bg-zinc-700/50 px-2 py-0.5 text-xs font-medium text-zinc-400">
                            Unassigned
                          </span>
                        )}
                      </div>
                      {row.lastTradeDate && (
                        <p className="text-xs text-zinc-500">
                          Last trade: {new Date(row.lastTradeDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {row.playbook?.description && (
                      <p className="mt-3 text-sm text-zinc-400">{row.playbook.description}</p>
                    )}

                    {row.playbook?.experimentHypothesis ? (
                      <p className="mt-3 rounded-lg bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
                        <span className="font-semibold uppercase tracking-wide text-violet-400">
                          Playbook experiment
                        </span>
                        <span className="mt-1 block text-zinc-300">
                          {row.playbook.experimentHypothesis}
                        </span>
                      </p>
                    ) : null}

                    {row.playbook?.principles && row.playbook.principles.length > 0 ? (
                      <ul className="mt-3 space-y-1 text-sm text-zinc-400">
                        {row.playbook.principles.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {row.playbook?.methodology ? (
                      <PlaybookMethodologyPanel methodology={row.playbook.methodology} />
                    ) : null}

                    {row.playbook?.executionExperiments ? (
                      <PlaybookExecutionPanel execution={row.playbook.executionExperiments} />
                    ) : null}

                    {row.playbook?.multiTimeframeHierarchy ? (
                      <PlaybookMultiTimeframePanel hierarchy={row.playbook.multiTimeframeHierarchy} />
                    ) : null}

                    {row.playbook?.scoutStatistics ? (
                      <PlaybookScoutStatisticsPanel stats={row.playbook.scoutStatistics} />
                    ) : null}

                    {row.playbook?.scoutingDimensions ? (
                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        {row.playbook.scoutingDimensions.thesisQuality?.length ? (
                          <div className="rounded-lg bg-zinc-950/60 p-3">
                            <p className="text-xs font-medium text-zinc-400">Thesis quality</p>
                            <ul className="mt-2 space-y-1 text-zinc-500">
                              {row.playbook.scoutingDimensions.thesisQuality.map((item) => (
                                <li key={item}>· {item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {row.playbook.scoutingDimensions.opportunityQuality?.length ? (
                          <div className="rounded-lg bg-zinc-950/60 p-3">
                            <p className="text-xs font-medium text-zinc-400">Opportunity quality</p>
                            <ul className="mt-2 space-y-1 text-zinc-500">
                              {row.playbook.scoutingDimensions.opportunityQuality.map((item) => (
                                <li key={item}>· {item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {row.playbook?.scoutingMetrics?.length ? (
                      <p className="mt-3 text-xs text-zinc-600">
                        Metrics: {row.playbook.scoutingMetrics.join(" · ")}
                      </p>
                    ) : null}

                    {row.playbook?.decisionPhilosophy ? (
                      <p className="mt-2 text-xs text-violet-300">{row.playbook.decisionPhilosophy}</p>
                    ) : null}

                    {row.playbook?.appliesMethodology ? (
                      <p className="mt-2 text-xs text-zinc-500">
                        Methodology:{" "}
                        <span className="font-mono text-zinc-400">
                          {row.playbook.appliesMethodology}
                        </span>
                      </p>
                    ) : null}

                    {row.playbook?.checklist && row.playbook.checklist.length > 0 && (
                      <ul className="mt-3 space-y-1 text-sm text-zinc-400">
                        {row.playbook.checklist.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}

                    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                      <Metric label="Trades" value={String(row.tradeCount)} />
                      <Metric label="Win rate" value={formatPct(row.winRate)} />
                      <Metric label="Profit factor" value={formatPf(row.profitFactor)} />
                      <Metric label="Expectancy" value={formatR(row.expectancyR)} />
                      <Metric
                        label="Net P/L"
                        value={formatUsd(row.netPnL)}
                        valueClass={pnlTone(row.netPnL)}
                      />
                      <Metric
                        label="Avg winner"
                        value={row.avgWinner !== null ? formatUsd(row.avgWinner) : "—"}
                        valueClass={row.avgWinner !== null ? "text-emerald-400" : undefined}
                      />
                      <Metric
                        label="Avg loser"
                        value={row.avgLoser !== null ? formatUsd(row.avgLoser) : "—"}
                        valueClass={row.avgLoser !== null ? "text-red-400" : undefined}
                      />
                      <Metric label="Mistakes" value={String(row.mistakesCount)} />
                      <Metric label="Closed" value={String(row.closedCount)} />
                    </dl>

                    {row.tradeIds.length > 0 && (
                      <div className="mt-4 border-t border-zinc-800 pt-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                          Trades
                        </p>
                        <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                          {row.tradeIds.map((id) => (
                            <li key={id}>
                              <Link
                                href={`/trades/${id}`}
                                className="rounded-md border border-zinc-700 bg-zinc-800/50 px-2 py-1 text-violet-400 hover:border-zinc-600 hover:text-violet-300"
                              >
                                {id}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          <nav className="flex gap-4 border-t border-zinc-800 pt-4 text-sm">
            <Link href="/stats" className="text-violet-400 hover:text-violet-300">
              Statistics →
            </Link>
            <Link href="/trades" className="text-zinc-400 hover:text-zinc-200">
              Trades
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  valueClass = "text-zinc-100",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className={`mt-0.5 font-medium tabular-nums ${valueClass}`}>{value}</dd>
    </div>
  );
}
