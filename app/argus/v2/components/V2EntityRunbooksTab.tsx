"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Runbook, RunbookProgress } from "@/lib/argus/types";
import {
  applyRunbookProgress,
  findRunbookProgress,
  runbookProgress as calcProgress,
} from "@/lib/argus/runbook-helpers";
import {
  copyRunbookToEntityAction,
  linkRunbookToEntityAction,
  unlinkRunbookFromEntityAction,
} from "@/app/argus/actions";
import { formatArgusError } from "@/lib/argus/persistence/errors";
import { V2RunbookWorkPanel } from "./V2RunbookWorkPanel";
import { V2RunbookCreateStrip } from "./V2RunbookCreateStrip";

type Level = "organization" | "project" | "topic" | "event";

/**
 * Runbooks tab for Org (library + admin) or Project/Topic/Event (linked + execute with per-level progress).
 */
export function V2EntityRunbooksTab({
  level,
  entityId,
  linkedRunbooks,
  libraryRunbooks = [],
  progressRecords = [],
}: {
  level: Level;
  entityId: string;
  linkedRunbooks: Runbook[];
  /** Org library / other runbooks available to link (not yet linked here). */
  libraryRunbooks?: Runbook[];
  progressRecords?: RunbookProgress[];
}) {
  const router = useRouter();
  const [screen, setScreen] = useState<"home" | "runbook">("home");
  const [selectedId, setSelectedId] = useState("");
  const [showCreate, setShowCreate] = useState(level === "organization" && linkedRunbooks.length === 0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isLibrary = level === "organization";
  const selected = useMemo(
    () => linkedRunbooks.find((r) => r.id === selectedId) ?? libraryRunbooks.find((r) => r.id === selectedId),
    [linkedRunbooks, libraryRunbooks, selectedId]
  );

  const progressForSelected = selected
    ? findRunbookProgress(progressRecords, selected.id, entityId)
    : undefined;

  const displayRunbook = useMemo(() => {
    if (!selected) return null;
    if (isLibrary && !progressForSelected) return selected;
    return {
      ...selected,
      items: applyRunbookProgress(selected, progressForSelected ?? null),
    };
  }, [selected, progressForSelected, isLibrary]);

  const linkable = useMemo(
    () => libraryRunbooks.filter((rb) => !rb.linkedEntityIds.includes(entityId)),
    [libraryRunbooks, entityId]
  );

  function openRunbook(id: string) {
    setSelectedId(id);
    setScreen("runbook");
    setShowCreate(false);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        const { layer, message } = formatArgusError(err);
        setError(`${layer.toUpperCase()}: ${message}`);
      }
    });
  }

  if (screen === "runbook" && displayRunbook) {
    return (
      <V2RunbookWorkPanel
        runbook={displayRunbook}
        onBack={() => setScreen("home")}
        backLabel="All runbooks"
        scopeEntityId={entityId}
        closed={progressForSelected?.closed ?? false}
        executeMode={!isLibrary}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">Runbooks</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {isLibrary
              ? "Organization library — create checklists, then link them to projects, topics, or events. Progress is stored at each level."
              : "Checklists linked here. Progress (checks / closed) is saved only for this level."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isLibrary ? (
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="rounded-xl border border-lime-500/30 bg-lime-500/10 px-3 py-1.5 text-xs font-semibold text-lime-300 hover:bg-lime-500/15"
            >
              {showCreate ? "Hide form" : "+ Runbook"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAssignOpen((v) => !v)}
              className="rounded-xl border border-lime-500/30 bg-lime-500/10 px-3 py-1.5 text-xs font-semibold text-lime-300 hover:bg-lime-500/15"
            >
              {assignOpen ? "Hide assign" : "Assign from library"}
            </button>
          )}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-xs text-rose-200">{error}</p>
      ) : null}

      {showCreate && isLibrary ? (
        <V2RunbookCreateStrip
          entityId={entityId}
          onCreated={(id) => openRunbook(id)}
          onCancel={() => setShowCreate(false)}
        />
      ) : null}

      {assignOpen && !isLibrary ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="mb-3 text-xs text-zinc-500">
            Select runbooks from the organization library (or other linked templates), then assign.
          </p>
          {linkable.length === 0 ? (
            <p className="text-sm text-zinc-500">No more runbooks to assign — create them on the Organization.</p>
          ) : (
            <ul className="mb-3 max-h-48 space-y-1 overflow-y-auto">
              {linkable.map((rb) => (
                <li key={rb.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800/80">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(rb.id)}
                      onChange={() => toggleSelect(rb.id)}
                      className="rounded border-zinc-600"
                    />
                    {rb.title}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending || selectedIds.length === 0}
              onClick={() =>
                run(async () => {
                  for (const id of selectedIds) {
                    await linkRunbookToEntityAction(id, entityId);
                  }
                  setSelectedIds([]);
                  setAssignOpen(false);
                })
              }
              className="rounded-lg bg-lime-500/15 px-3 py-1.5 text-xs font-semibold text-lime-300 ring-1 ring-lime-500/30 disabled:opacity-40"
            >
              Assign selected ({selectedIds.length})
            </button>
            <button
              type="button"
              disabled={isPending || selectedIds.length !== 1}
              onClick={() =>
                run(async () => {
                  const id = selectedIds[0];
                  if (!id) return;
                  const result = await copyRunbookToEntityAction(id, entityId);
                  setSelectedIds([]);
                  openRunbook(result.id);
                })
              }
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-40"
            >
              Copy selected here
            </button>
          </div>
        </div>
      ) : null}

      {linkedRunbooks.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
          {isLibrary
            ? "No runbooks yet — create a checklist template above."
            : "No runbooks linked yet — assign from the organization library."}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {linkedRunbooks.map((runbook) => {
            const prog = findRunbookProgress(progressRecords, runbook.id, entityId);
            const items = applyRunbookProgress(runbook, prog ?? null);
            const stats = calcProgress(items);
            const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
            return (
              <div
                key={runbook.id}
                className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-lime-500/30"
              >
                <button type="button" onClick={() => openRunbook(runbook.id)} className="text-left">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-zinc-100">{runbook.title}</span>
                    {prog?.closed ? (
                      <span className="shrink-0 text-[10px] font-medium text-sky-300">Closed</span>
                    ) : null}
                  </div>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <span className="block h-full rounded-full bg-lime-500/60" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="mt-2 block text-[10px] tabular-nums text-zinc-500">
                    {stats.open} open · {stats.done}/{stats.total} checks
                  </span>
                </button>
                {!isLibrary ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => run(() => unlinkRunbookFromEntityAction(runbook.id, entityId))}
                    className="self-start text-[10px] text-zinc-600 hover:text-rose-300"
                  >
                    Unlink
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
