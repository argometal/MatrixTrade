"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toggleSignalTagAction } from "@/app/argus/actions";
import { signalTagKey } from "@/lib/argus/signal-tags";

/**
 * Evidence Tag chip — click toggles Focus Flag (shine / track).
 * Size steps with repetition so Patterns and one-offs share one control.
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
      title={localFlagged ? `Unflag “${tag}”` : `Flag “${tag}” to track`}
      aria-pressed={localFlagged}
      className={`inline-flex items-center gap-1 rounded-full border font-medium transition disabled:opacity-50 ${size} ${
        localFlagged
          ? "border-rose-400/50 bg-rose-950/45 text-rose-100 shadow-[0_0_12px_rgba(251,113,133,0.25)]"
          : "border-zinc-700/80 bg-zinc-950/50 text-zinc-300 hover:border-rose-500/35 hover:text-rose-100"
      }`}
    >
      <span>{tag}</span>
      {count != null && count > 0 ? (
        <span className={localFlagged ? "text-rose-200/70" : "text-zinc-600"}>· {count}</span>
      ) : null}
      {localFlagged ? <span aria-hidden>⚑</span> : null}
    </button>
  );
}

export function tagIsFlagged(tag: string, focusKeys: Set<string>): boolean {
  return focusKeys.has(signalTagKey(tag));
}

export function focusKeySet(signalTags: string[]): Set<string> {
  return new Set(signalTags.map(signalTagKey));
}
