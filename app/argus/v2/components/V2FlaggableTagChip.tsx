"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toggleSignalTagAction } from "@/app/argus/actions";
import { signalTagKey } from "@/lib/argus/signal-tags";

/**
 * Evidence Tag chip — click toggles Tracker (Flag / Unflag).
 * Size steps with repetition so Patterns and one-offs share one control.
 * Trackers stay visibly marked — not a soft hover glow.
 */
export function V2FlaggableTagChip({
  tag,
  count,
  flagged,
  onFlaggedChange,
}: {
  tag: string;
  /** Evidence hits carrying this tag (optional — drives size). */
  count?: number;
  flagged: boolean;
  /** Parent can sync focus list after toggle. */
  onFlaggedChange?: (signalTags: string[], active: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [localFlagged, setLocalFlagged] = useState(flagged);

  useEffect(() => {
    setLocalFlagged(flagged);
  }, [flagged, tag]);

  const n = count ?? 1;
  const size =
    n >= 8
      ? "px-3 py-1.5 text-sm"
      : n >= 3
        ? "px-2.5 py-1 text-xs"
        : "px-2 py-0.5 text-[11px]";

  function toggle() {
    startTransition(async () => {
      const result = await toggleSignalTagAction(tag);
      if ("error" in result) return;
      setLocalFlagged(result.active);
      onFlaggedChange?.(result.signalTags, result.active);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title={localFlagged ? `Unflag “${tag}” tracker` : `Flag “${tag}” as Tracker`}
      aria-pressed={localFlagged}
      className={`inline-flex items-center gap-1 rounded-full border font-medium transition disabled:opacity-50 ${size} ${
        localFlagged
          ? "border-amber-400/80 bg-rose-950/70 text-amber-100 ring-2 ring-rose-500/55 shadow-[0_0_0_1px_rgba(251,191,36,0.45),0_0_18px_rgba(244,63,94,0.35)]"
          : "border-zinc-700/80 bg-zinc-950/50 text-zinc-300 hover:border-rose-500/45 hover:text-rose-100"
      }`}
    >
      {localFlagged ? (
        <span className="font-semibold text-amber-300" aria-hidden>
          ⚑
        </span>
      ) : null}
      <span>{tag}</span>
      {count != null && count > 0 ? (
        <span className={localFlagged ? "text-amber-200/75" : "text-zinc-600"}>· {count}</span>
      ) : null}
    </button>
  );
}

export function tagIsFlagged(tag: string, focusKeys: Set<string>): boolean {
  return focusKeys.has(signalTagKey(tag));
}

export function focusKeySet(signalTags: string[]): Set<string> {
  return new Set(signalTags.map(signalTagKey));
}
