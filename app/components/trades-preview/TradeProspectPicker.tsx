"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  formatTradeProspectLabel,
  prospectToPrefill,
  type TradeProspect,
} from "@/lib/trade-prospects";
import { buildTradeLevelsView } from "@/lib/trade-levels-preview";

export function TradeProspectPicker({
  prospects,
  selectedPlanId,
  onSelect,
}: {
  prospects: TradeProspect[];
  selectedPlanId: string;
  onSelect: (prospect: TradeProspect | null) => void;
}) {
  const router = useRouter();
  const selected = prospects.find((p) => p.planId === selectedPlanId);

  const levelsView =
    selected?.entry !== undefined && selected.stop !== undefined
      ? buildTradeLevelsView({
          id: "—",
          ticker: selected.ticker,
          entry: selected.entry,
          stop: selected.stop,
          target: selected.target,
          shares: 10,
        })
      : null;

  function handleChange(planId: string) {
    if (!planId) {
      onSelect(null);
      router.replace("/trades-preview", { scroll: false });
      return;
    }
    const prospect = prospects.find((p) => p.planId === planId);
    if (!prospect) return;
    onSelect(prospect);
    router.replace(prospect.enterHref, { scroll: false });
  }

  return (
    <section className="rounded-2xl border border-sky-500/30 bg-sky-950/15 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-sky-200">Scout prospects</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {prospects.length === 0
              ? "No active scouts with entry/stop yet — create stock cases in Scouting Desk."
              : `${prospects.length} prospect${prospects.length === 1 ? "" : "s"} ready to size for execution.`}
          </p>
        </div>
        {prospects.length > 0 ? (
          <Link
            href="/planning"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
          >
            Scouting Desk
          </Link>
        ) : null}
      </div>

      {prospects.length > 0 ? (
        <>
          <label className="mt-3 block text-xs text-zinc-500">
            Select prospect
            <select
              value={selectedPlanId}
              onChange={(e) => handleChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="">— Choose scout to execute —</option>
              {prospects.map((prospect) => (
                <option key={prospect.planId} value={prospect.planId}>
                  {formatTradeProspectLabel(prospect)}
                </option>
              ))}
            </select>
          </label>

          {selected ? (
            <div className="mt-3 rounded-xl border border-sky-500/20 bg-zinc-950/50 p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-sky-200">
                  {selected.ticker} · {selected.planId}
                  {selected.verdict ? (
                    <span className="ml-2 text-zinc-500">decision: {selected.verdict}</span>
                  ) : null}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selected.stockThesisId ? (
                    <Link
                      href={`/stock-theses/${selected.stockThesisId}`}
                      className="text-violet-300 hover:underline"
                    >
                      Profile
                    </Link>
                  ) : null}
                  <Link
                    href={`/planning?plan=${selected.planId}`}
                    className="text-zinc-400 hover:underline"
                  >
                    Scout map
                  </Link>
                </div>
              </div>
              {levelsView ? (
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
                  {levelsView.rows.map((row) => (
                    <div key={row.label}>
                      <dt className="text-zinc-600">{row.label}</dt>
                      <dd className="tabular-nums text-zinc-300">{row.value}</dd>
                    </div>
                  ))}
                  {selected.plannedRR !== undefined ? (
                    <div>
                      <dt className="text-zinc-600">Planned R:R</dt>
                      <dd className="font-medium text-emerald-400">
                        {selected.plannedRR.toFixed(1)}R
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
              {selected.thesisSnippet ? (
                <p className="mt-2 text-zinc-500 line-clamp-2">{selected.thesisSnippet}</p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <Link
          href="/stock-theses/new"
          className="mt-3 inline-block text-xs text-violet-300 hover:underline"
        >
          + New stock case
        </Link>
      )}
    </section>
  );
}
