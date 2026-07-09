"use client";

import { useMemo, useState } from "react";
import type { V2EventInboxOption } from "@/lib/argus/v2/event-browse-utils";
import { linkInboxEmailToEventAction } from "@/app/argus/actions";

export function V2EventLinkEmailModal({
  open,
  eventId,
  options,
  onClose,
  onLinked,
}: {
  open: boolean;
  eventId: string;
  options: V2EventInboxOption[];
  onClose: () => void;
  onLinked: () => void;
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.subject.toLowerCase().includes(q) ||
        o.from.toLowerCase().includes(q)
    );
  }, [options, query]);

  async function linkEmail(inboxId: string) {
    setBusy(inboxId);
    setError(null);
    try {
      await linkInboxEmailToEventAction(inboxId, eventId);
      onLinked();
      onClose();
    } catch {
      setError("Could not link email.");
    } finally {
      setBusy(null);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(520px,85vh)] w-full max-w-lg flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-800 px-4 py-3">
          <h3 className="text-[15px] font-semibold text-zinc-100">Link email to event</h3>
          <p className="mt-1 text-xs text-zinc-500">Attach inbox evidence to this occurrence.</p>
        </div>
        <div className="p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subject or sender…"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
            autoFocus
          />
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 pb-4">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">No emails found.</p>
          ) : (
            filtered.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={option.alreadyLinked || busy === option.id}
                onClick={() => void linkEmail(option.id)}
                className="flex w-full items-start gap-3 rounded-xl border border-zinc-800/80 px-3 py-2.5 text-left transition hover:border-violet-500/35 hover:bg-zinc-900/80 disabled:opacity-50"
              >
                <span className="mt-0.5 text-sm" aria-hidden>
                  ✉
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-zinc-100">{option.subject}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    {option.from} · {option.date}
                  </span>
                </span>
                {option.alreadyLinked ? (
                  <span className="shrink-0 text-[10px] text-emerald-400">Linked</span>
                ) : busy === option.id ? (
                  <span className="shrink-0 text-[10px] text-zinc-500">…</span>
                ) : null}
              </button>
            ))
          )}
        </div>
        {error ? <p className="px-4 pb-2 text-xs text-red-400">{error}</p> : null}
        <div className="border-t border-zinc-800 p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-zinc-700 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
