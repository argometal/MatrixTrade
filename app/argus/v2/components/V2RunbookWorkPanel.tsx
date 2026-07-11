"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Runbook, RunbookItem, RunbookSubtask } from "@/lib/argus/types";
import {
  addRunbookCardAction,
  addRunbookSubtaskAction,
  toggleRunbookItemAction,
  toggleRunbookSubtaskAction,
} from "@/app/argus/actions";
import { runbookCardProgress, runbookProgress } from "@/lib/argus/runbook-helpers";
import { formatArgusError } from "@/lib/argus/persistence/errors";

function RunbookCard({
  runbookId,
  item,
  disabled,
  onError,
}: {
  runbookId: string;
  item: RunbookItem;
  disabled: boolean;
  onError: (message: string | null) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const progress = useMemo(() => runbookCardProgress(item), [item]);
  const subtasks = item.subtasks ?? [];
  const busy = disabled || isPending;

  function run(action: () => Promise<void>) {
    onError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        const { layer, message } = formatArgusError(err);
        onError(`${layer.toUpperCase()}: ${message}`);
      }
    });
  }

  function handleToggleCard(nextDone: boolean) {
    run(() => toggleRunbookItemAction(runbookId, item.id, nextDone));
  }

  function handleToggleSubtask(subtask: RunbookSubtask, nextDone: boolean) {
    run(() => toggleRunbookSubtaskAction(runbookId, item.id, subtask.id, nextDone));
  }

  function handleAddSubtask(event: FormEvent) {
    event.preventDefault();
    const text = subtaskDraft.trim();
    if (!text) return;
    run(async () => {
      await addRunbookSubtaskAction(runbookId, item.id, text);
      setSubtaskDraft("");
      setAddingSubtask(false);
    });
  }

  return (
    <article
      className={`rounded-2xl border px-3.5 py-3 shadow-sm transition ${
        item.done
          ? "border-zinc-800/70 bg-zinc-950/50 opacity-80"
          : "border-zinc-800/90 bg-zinc-900/70 hover:border-lime-500/25"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={item.done}
          disabled={busy}
          onChange={(event) => handleToggleCard(event.target.checked)}
          className="mt-1 shrink-0"
          aria-label={item.done ? "Mark card open" : "Mark card done"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p
              className={`text-sm font-medium leading-relaxed ${
                item.done ? "text-zinc-500 line-through" : "text-zinc-100"
              }`}
            >
              {item.text}
            </p>
            {progress.total > 0 ? (
              <span className="shrink-0 rounded-md bg-zinc-950/80 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-400 ring-1 ring-zinc-800">
                {progress.done}/{progress.total}
              </span>
            ) : null}
          </div>

          {subtasks.length > 0 ? (
            <ul className="mt-3 space-y-1.5 border-t border-zinc-800/80 pt-3">
              {subtasks.map((subtask) => (
                <li key={subtask.id}>
                  <label className="flex items-start gap-2 rounded-lg px-1 py-0.5 hover:bg-zinc-950/40">
                    <input
                      type="checkbox"
                      checked={subtask.done}
                      disabled={busy}
                      onChange={(event) => handleToggleSubtask(subtask, event.target.checked)}
                      className="mt-0.5 shrink-0"
                    />
                    <span
                      className={`text-xs leading-relaxed ${
                        subtask.done ? "text-zinc-600 line-through" : "text-zinc-300"
                      }`}
                    >
                      {subtask.text}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : null}

          {addingSubtask ? (
            <form onSubmit={handleAddSubtask} className="mt-3 flex gap-2">
              <input
                autoFocus
                value={subtaskDraft}
                onChange={(event) => setSubtaskDraft(event.target.value)}
                disabled={busy}
                placeholder="Checklist item…"
                className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-lime-500/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy || !subtaskDraft.trim()}
                className="rounded-lg bg-lime-500/15 px-2.5 py-1.5 text-xs font-medium text-lime-300 ring-1 ring-lime-500/30 hover:bg-lime-500/25 disabled:opacity-40"
              >
                Add
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setAddingSubtask(false);
                  setSubtaskDraft("");
                }}
                className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-300"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => setAddingSubtask(true)}
              className="mt-3 text-left text-[11px] font-medium text-zinc-500 hover:text-lime-300"
            >
              + Add subtask
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function V2RunbookWorkPanel({ runbook }: { runbook: Runbook }) {
  const router = useRouter();
  const [showDone, setShowDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardDraft, setCardDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  const progress = useMemo(() => runbookProgress(runbook.items), [runbook.items]);

  const visibleItems = useMemo(() => {
    if (showDone) return runbook.items;
    return runbook.items.filter((item) => item.type === "sep" || !item.done);
  }, [runbook.items, showDone]);

  function handleAddCard(event: FormEvent) {
    event.preventDefault();
    const text = cardDraft.trim();
    if (!text) return;
    setError(null);
    startTransition(async () => {
      try {
        await addRunbookCardAction(runbook.id, text);
        setCardDraft("");
        router.refresh();
      } catch (err) {
        const { layer, message } = formatArgusError(err);
        setError(`${layer.toUpperCase()}: ${message}`);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3">
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
          {progress.total} cards
        </span>
        <span className="rounded-full bg-lime-500/10 px-3 py-1 text-xs text-lime-300">
          {progress.open} open
        </span>
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-500">
          {progress.done} done
        </span>
        <label className="ml-auto flex items-center gap-2 text-xs text-zinc-500">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(event) => setShowDone(event.target.checked)}
            className="rounded border-zinc-700"
          />
          Show done
        </label>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {visibleItems.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
            {showDone ? "No cards yet." : "All cards done — or nothing to show."}
          </p>
        ) : (
          visibleItems.map((item) =>
            item.type === "sep" ? (
              <div key={item.id} className="border-t border-zinc-700/70 pt-1" aria-hidden />
            ) : (
              <RunbookCard
                key={item.id}
                runbookId={runbook.id}
                item={item}
                disabled={isPending}
                onError={setError}
              />
            )
          )
        )}
      </div>

      <form
        onSubmit={handleAddCard}
        className="rounded-2xl border border-dashed border-zinc-700/80 bg-zinc-950/40 p-3"
      >
        <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          New card
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={cardDraft}
            onChange={(event) => setCardDraft(event.target.value)}
            disabled={isPending}
            placeholder="What needs to be done…"
            className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-lime-500/40 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isPending || !cardDraft.trim()}
            className="rounded-xl bg-lime-500/15 px-4 py-2.5 text-sm font-medium text-lime-300 ring-1 ring-lime-500/30 hover:bg-lime-500/25 disabled:opacity-40"
          >
            Add card
          </button>
        </div>
      </form>

      <p className="text-[11px] text-zinc-600">
        Updated {runbook.updatedAt.slice(0, 19).replace("T", " ")} · Execution checklist — not timeline
        evidence
      </p>
    </div>
  );
}
