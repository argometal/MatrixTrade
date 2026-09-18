"use client";

import { useMemo } from "react";
import { loadDeckOverview } from "@/lib/argus/lab/match-logic";
import type { TrainingLabData } from "@/lib/argus/lab/types";

export function LabProgressTab({ data }: { data: TrainingLabData }) {
  const deckStats = useMemo(
    () =>
      data.decks.map((d) => ({
        deck: d,
        overview: loadDeckOverview(data.pairs, data.pairStates, d.id),
      })),
    [data.decks, data.pairs, data.pairStates],
  );

  const metrics = [...data.sequenceMetrics].reverse().slice(0, 30);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-zinc-200">Match decks</h2>
        <ul className="mt-3 space-y-2">
          {deckStats.map(({ deck, overview }) => (
            <li
              key={deck.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-sm"
            >
              <span className="font-medium text-zinc-100">{deck.name}</span>
              <span className="text-zinc-500">
                {overview.pairCount} pairs · due {overview.dueCount}
                {overview.matchRatePercent != null ? ` · ${overview.matchRatePercent}% match` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-200">Sequence drill history</h2>
        {metrics.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            Complete a sequence session and tap “Save to history” on the results screen.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Mode</th>
                  <th className="px-3 py-2">Len</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Imm.</th>
                  <th className="px-3 py-2">Del.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {metrics.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2 text-zinc-400">{m.dateUtc}</td>
                    <td className="px-3 py-2 capitalize text-zinc-300">{m.modality}</td>
                    <td className="px-3 py-2 text-zinc-400">{m.sequenceLength}</td>
                    <td className="px-3 py-2 font-medium text-amber-200/90">
                      {Math.round(m.scoreNorm * 100)}%
                    </td>
                    <td className="px-3 py-2 text-zinc-400">{Math.round(m.accImmediate * 100)}%</td>
                    <td className="px-3 py-2 text-zinc-400">{Math.round(m.accDelayed * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
