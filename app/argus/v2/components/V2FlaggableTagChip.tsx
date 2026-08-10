"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toggleSignalTagAction } from "@/app/argus/actions";
import { signalTagKey } from "@/lib/argus/signal-tags";
import { confirmTrackerConvert } from "@/lib/argus/tracker-confirm";
import {
  TAG_MANAGE_ROW_CLASS,
  TAG_MANAGE_ROW_TRACKER_CLASS,
} from "./tag-manage-list";

/**
 * Evidence Tag row — Manage List · rows orientation.
 * Click toggles Tracker (Flag / Disable) after confirm.
 */
export function V2FlaggableTagChip({
  tag,
  count,
  flagged,
  onFlaggedChange,
}: {
  tag: string;
  count?: number;
  flagged: boolean;
  onFlaggedChange?: (signalTags: string[], active: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [localFlagged, setLocalFlagged] = useState(flagged);

  useEffect(() => {
    setLocalFlagged(flagged);
  }, [flagged, tag]);

  function toggle() {
    if (!confirmTrackerConvert(tag, localFlagged)) return;
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
      title={
        localFlagged
          ? `Disable Tracker on “${tag}” — Tag stays (asks to confirm)`
          : `Flag “${tag}” as Tracker (asks to confirm)`
      }
      aria-pressed={localFlagged}
      className={`${localFlagged ? TAG_MANAGE_ROW_TRACKER_CLASS : TAG_MANAGE_ROW_CLASS} disabled:opacity-50`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
          localFlagged ? "bg-amber-500/20 text-amber-100" : "bg-violet-600/20 text-violet-200"
        }`}
        aria-hidden
      >
        {localFlagged ? "⚑" : "#"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-zinc-100">{tag}</span>
        <span className="mt-0.5 block text-xs text-zinc-500">
          {localFlagged ? "Tracker" : "Tag"}
          {count != null && count > 0 ? ` · ${count}` : ""}
        </span>
      </span>
      <span className="shrink-0 text-[10px] uppercase tracking-wide text-zinc-500">
        {localFlagged ? "Flagged" : "Flag"}
      </span>
    </button>
  );
}

export function tagIsFlagged(tag: string, focusKeys: Set<string>): boolean {
  return focusKeys.has(signalTagKey(tag));
}

export function focusKeySet(signalTags: string[]): Set<string> {
  return new Set(signalTags.map(signalTagKey));
}
