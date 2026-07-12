"use client";

import { useMemo, useState } from "react";
import type { Runbook } from "@/lib/argus/types";
import { runbookProgress } from "@/lib/argus/runbook-helpers";
import { V2RunbookWorkPanel } from "./V2RunbookWorkPanel";
import { V2RunbookCreateStrip } from "./V2RunbookCreateStrip";

type PickerView = "board" | "list";

function pickerToggleClass(active: boolean) {
  return `rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
    active
      ? "bg-lime-500/15 text-lime-300 ring-1 ring-lime-500/30"
      : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
  }`;
}

export function V2ProjectRunbooksTab({
  runbooks,
  projectId,
}: {
  runbooks: Runbook[];
  projectId: string;
}) {
  const [showCreate, setShowCreate] = useState(runbooks.length === 0);
  const [pickerView, setPickerView] = useState<PickerView>("board");
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
          <p className="mt-1 text-xs text-zinc-500">
            Flat checklists — pick a runbook, then work cards in board or list view.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {runbooks.length > 1 ? (
            <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950/60 p-0.5">
              <button type="button" onClick={() => setPickerView("board")} className={pickerToggleClass(pickerView === "board")}>
                Board
              </button>
              <button type="button" onClick={() => setPickerView("list")} className={pickerToggleClass(pickerView === "list")}>
                List
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="rounded-xl border border-lime-500/30 bg-lime-500/10 px-3 py-1.5 text-xs font-semibold text-lime-300 hover:bg-lime-500/15"
          >
            {showCreate ? "Hide form" : "+ Runbook"}
          </button>
        </div>
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
            pickerView === "board" ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {runbooks.map((runbook) => {
                  const progress = runbookProgress(runbook.items);
                  const active = runbook.id === selected?.id;
                  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
                  return (
                    <button
                      key={runbook.id}
                      type="button"
                      onClick={() => setSelectedId(runbook.id)}
                      className={`w-56 shrink-0 rounded-2xl border px-4 py-3 text-left transition ${
                        active
                          ? "border-lime-500/40 bg-lime-500/10 text-lime-100 ring-1 ring-lime-500/20"
                          : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      <span className="block line-clamp-2 text-sm font-semibold">{runbook.title}</span>
                      <span className="mt-2 block text-[10px] tabular-nums text-zinc-500">
                        {progress.open} open · {progress.done}/{progress.total} done
                      </span>
                      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-zinc-800">
                        <span className="block h-full rounded-full bg-lime-500/60" style={{ width: `${pct}%` }} />
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {runbooks.map((runbook) => {
                  const progress = runbookProgress(runbook.items);
                  const active = runbook.id === selected?.id;
                  return (
                    <button
                      key={runbook.id}
                      type="button"
                      onClick={() => setSelectedId(runbook.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                        active
                          ? "border-lime-500/40 bg-lime-500/10 text-lime-100"
                          : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      <span className="min-w-0 truncate text-sm font-medium">{runbook.title}</span>
                      <span className="shrink-0 text-[10px] tabular-nums text-zinc-500">
                        {progress.open}/{progress.total} open
                      </span>
                    </button>
                  );
                })}
              </div>
            )
          ) : null}

          {selected ? <V2RunbookWorkPanel runbook={selected} /> : null}
        </>
      )}
    </div>
  );
}
