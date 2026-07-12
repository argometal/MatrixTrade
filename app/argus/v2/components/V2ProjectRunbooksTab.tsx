"use client";

import { useMemo, useState } from "react";
import type { Runbook } from "@/lib/argus/types";
import { runbookProgress } from "@/lib/argus/runbook-helpers";
import { V2RunbookWorkPanel } from "./V2RunbookWorkPanel";
import { V2RunbookCreateStrip } from "./V2RunbookCreateStrip";

export function V2ProjectRunbooksTab({
  runbooks,
  projectId,
}: {
  runbooks: Runbook[];
  projectId: string;
}) {
  const [showCreate, setShowCreate] = useState(runbooks.length === 0);
  const [selectedId, setSelectedId] = useState(runbooks[0]?.id ?? "");

  const selected = useMemo(
    () => runbooks.find((r) => r.id === selectedId) ?? runbooks[0],
    [runbooks, selectedId]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">Runbooks</h2>
          <p className="mt-1 text-xs text-zinc-500">Execution checklists — cards with optional subtasks.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-xl border border-lime-500/30 bg-lime-500/10 px-3 py-1.5 text-xs font-semibold text-lime-300 hover:bg-lime-500/15"
        >
          {showCreate ? "Hide form" : "+ Runbook"}
        </button>
      </div>

      {showCreate ? (
        <V2RunbookCreateStrip
          projectId={projectId}
          onCreated={(id) => {
            setSelectedId(id);
            setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
        />
      ) : null}

      {runbooks.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
          No runbooks yet — use the form above to add one.
        </p>
      ) : (
        <>
          {runbooks.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {runbooks.map((runbook) => {
                const progress = runbookProgress(runbook.items);
                const active = runbook.id === selected?.id;
                return (
                  <button
                    key={runbook.id}
                    type="button"
                    onClick={() => setSelectedId(runbook.id)}
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                      active
                        ? "border-lime-500/40 bg-lime-500/10 text-lime-100"
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    <span className="block font-medium">{runbook.title}</span>
                    <span className="text-[10px] tabular-nums text-zinc-500">
                      {progress.open}/{progress.total} open
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {selected ? <V2RunbookWorkPanel runbook={selected} /> : null}
        </>
      )}
    </div>
  );
}
