"use client";

import { useEffect, useState } from "react";
import type { TrainingLabData } from "@/lib/argusforge/training-lab/types";
import { LabProgressTab } from "./LabProgressTab";
import { MatchDecksTab } from "./MatchDecksTab";
import { SequenceDrillTab } from "./SequenceDrillTab";

type Tab = "match" | "sequence" | "progress";

export function TrainingLabShell({ initial }: { initial: TrainingLabData }) {
  const [tab, setTab] = useState<Tab>("match");
  const [data, setData] = useState(initial);

  useEffect(() => {
    if (tab !== "progress") return;
    void refresh(setData);
  }, [tab]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-600/90">Experimental</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-50">Training Lab</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Mind training — match decks (image ↔ word) and sequence drills (cards / numbers). Separate from
          Chaos capture; evolves toward future Alexandria without changing Forge ontology.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
        {(
          [
            ["match", "Match decks"],
            ["sequence", "Sequence drill"],
            ["progress", "Progress"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === id
                ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/40"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "match" ? (
        <MatchDecksTab data={data} onDataChange={setData} />
      ) : null}
      {tab === "sequence" ? <SequenceDrillTab data={data} onMetricSaved={() => void refresh(setData)} /> : null}
      {tab === "progress" ? <LabProgressTab data={data} /> : null}
    </div>
  );
}

async function refresh(setData: (d: TrainingLabData) => void) {
  const { getTrainingLabDataAction } = await import("@/app/forge/lab/actions");
  setData(await getTrainingLabDataAction());
}
