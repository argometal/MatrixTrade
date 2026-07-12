"use client";

import { useMemo, useState } from "react";
import type { Runbook } from "@/lib/argus/types";
import { runbookProgress } from "@/lib/argus/runbook-helpers";
import { V2RunbookWorkPanel } from "./V2RunbookWorkPanel";
import { V2RunbookCreateStrip } from "./V2RunbookCreateStrip";

type TabScreen = "home" | "runbook";

export function V2ProjectRunbooksTab({
  runbooks,
  projectId,
}: {
  runbooks: Runbook[];
  projectId: string;
}) {
  const [screen, setScreen] = useState<TabScreen>("home");
  const [showCreate, setShowCreate] = useState(runbooks.length === 0);
  const [selectedId, setSelectedId] = useState("");

  const selected = useMemo(
    () => runbooks.find((r) => r.id === selectedId),
    [runbooks, selectedId]
  );

  function openRunbook(id: string) {
    setSelectedId(id);
    setScreen("runbook");
    setShowCreate(false);
  }

  function backToHome() {
    setScreen("home");
  }

  if (screen === "runbook" && selected) {
    return (
      <V2RunbookWorkPanel
        runbook={selected}
        onBack={backToHome}
        backLabel="All runbooks"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">Runbooks</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Open a runbook to work its checklist — bulk edit, check off, export.
          </p>
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
            openRunbook(id);
          }}
          onCancel={() => setShowCreate(false)}
        />
      ) : null}

      {runbooks.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
          No runbooks yet — use the form above to add one.
        </p>
      ) : (
        <div className="space-y-2">
          {runbooks.map((runbook) => {
            const progress = runbookProgress(runbook.items);
            const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
            return (
              <button
                key={runbook.id}
                type="button"
                onClick={() => openRunbook(runbook.id)}
                className="flex w-full flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-left transition hover:border-lime-500/30 hover:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-sm font-semibold text-zinc-100">{runbook.title}</span>
                  <span className="shrink-0 text-[10px] tabular-nums text-zinc-500">
                    {progress.open} open · {progress.done}/{progress.total}
                  </span>
                </div>
                <span className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <span className="block h-full rounded-full bg-lime-500/60" style={{ width: `${pct}%` }} />
                </span>
                <span className="text-[10px] text-zinc-600">
                  Updated {runbook.updatedAt.slice(0, 10)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
