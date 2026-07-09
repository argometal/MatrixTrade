"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Runbook, RunbookItem } from "@/lib/argus/types";
import { toggleRunbookItemAction } from "@/app/argus/actions";
import { runbookProgress } from "@/lib/argus/runbook-helpers";
import { formatArgusError } from "@/lib/argus/persistence/errors";

export function V2RunbookWorkPanel({ runbook }: { runbook: Runbook }) {
  const router = useRouter();
  const [showDone, setShowDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const progress = useMemo(() => runbookProgress(runbook.items), [runbook.items]);

  const visibleItems = useMemo(() => {
    if (showDone) return runbook.items;
    return runbook.items.filter((item) => item.type === "sep" || !item.done);
  }, [runbook.items, showDone]);

  function handleToggle(item: RunbookItem, nextDone: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        await toggleRunbookItemAction(runbook.id, item.id, nextDone);
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
          {progress.total} items
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
          Show accomplished
        </label>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        {visibleItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
            {showDone ? "No steps yet." : "All steps done — or nothing to show."}
          </p>
        ) : (
          visibleItems.map((item) =>
            item.type === "sep" ? (
              <div key={item.id} className="border-t border-zinc-700/80 pt-3" aria-hidden />
            ) : (
              <label
                key={item.id}
                className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition ${
                  item.done
                    ? "border-zinc-800/60 bg-zinc-950/40 opacity-70"
                    : "border-zinc-800/80 bg-zinc-900/40 hover:border-lime-500/30"
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.done}
                  disabled={isPending}
                  onChange={(event) => handleToggle(item, event.target.checked)}
                  className="mt-1 shrink-0"
                />
                <span className={`text-sm leading-relaxed ${item.done ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
                  {item.text}
                </span>
              </label>
            )
          )
        )}
      </div>

      <p className="text-[11px] text-zinc-600">
        Updated {runbook.updatedAt.slice(0, 19).replace("T", " ")} · Execution — not timeline evidence
      </p>
    </div>
  );
}
