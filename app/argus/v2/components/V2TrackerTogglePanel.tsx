"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSignalTagAction } from "@/app/argus/actions";
import { signalTagKey } from "@/lib/argus/signal-tags";
import {
  V2FlaggableTagChip,
  focusKeySet,
  tagIsFlagged,
} from "./V2FlaggableTagChip";

export type V2TrackerToggleTag = {
  tag: string;
  /** Evidence uses on this surface (0 / omitted = Tag with no notes here yet). */
  count?: number;
};

const KNOWN_EXTRAS_KEY = "argus:v2:tracker-known-extras";

function readKnownExtras(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(KNOWN_EXTRAS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
  } catch {
    return [];
  }
}

function writeKnownExtras(tags: string[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KNOWN_EXTRAS_KEY, JSON.stringify(tags.slice(0, 200)));
  } catch {
    /* ignore quota */
  }
}

/**
 * Tag ↔ Tracker without delete.
 * Click a chip to Flag / Disable Tracker. Add Flagged name via the input.
 * Tags stay visible so you can re-Flag after Disable.
 */
export function V2TrackerTogglePanel({
  evidenceTags,
  signalTags,
  onSignalTagsChange,
  heading = "Tags (click to Flag / Disable Tracker)",
  hint = "Flag turns a Tag into a Tracker. Disable Tracker turns watch off — the Tag stays so you can Flag it again. This never deletes Tags from Notes.",
  addPlaceholder = "Tag name to Flag as Tracker…",
}: {
  /** Tags from Notes/emails on this surface — always listed. */
  evidenceTags: V2TrackerToggleTag[];
  signalTags: string[];
  onSignalTagsChange?: (next: string[]) => void;
  heading?: string;
  hint?: string;
  addPlaceholder?: string;
}) {
  const router = useRouter();
  const [focusTags, setFocusTags] = useState(signalTags);
  /** Tracker-only names Flagged here (no note count yet) — kept after Disable so you can re-Flag. */
  const [knownExtras, setKnownExtras] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const prevFocusRef = useRef<string[]>(signalTags);

  useEffect(() => {
    setKnownExtras(readKnownExtras());
  }, []);

  useEffect(() => {
    setFocusTags(signalTags);
  }, [signalTags]);

  /** When a Tracker is Disabled, keep the name in the chip list for re-Flag. */
  useEffect(() => {
    const prev = prevFocusRef.current;
    const nextKeys = new Set(focusTags.map(signalTagKey).filter(Boolean));
    const dropped = prev.filter((tag) => {
      const key = signalTagKey(tag);
      return key && !nextKeys.has(key);
    });
    prevFocusRef.current = focusTags;
    if (dropped.length === 0) return;
    setKnownExtras((current) => {
      const byKey = new Map(current.map((t) => [signalTagKey(t), t] as const));
      for (const tag of dropped) {
        const key = signalTagKey(tag);
        if (key && !byKey.has(key)) byKey.set(key, tag.trim());
      }
      const next = [...byKey.values()];
      writeKnownExtras(next);
      return next;
    });
  }, [focusTags]);

  const focusKeys = useMemo(() => focusKeySet(focusTags), [focusTags]);

  const rows = useMemo(() => {
    const byKey = new Map<string, V2TrackerToggleTag>();
    for (const row of evidenceTags) {
      const key = signalTagKey(row.tag);
      if (!key) continue;
      byKey.set(key, { tag: row.tag.trim(), count: row.count });
    }
    for (const tag of focusTags) {
      const key = signalTagKey(tag);
      if (!key || byKey.has(key)) continue;
      byKey.set(key, { tag: tag.trim() });
    }
    for (const tag of knownExtras) {
      const key = signalTagKey(tag);
      if (!key || byKey.has(key)) continue;
      byKey.set(key, { tag: tag.trim() });
    }
    return [...byKey.values()].sort((a, b) => a.tag.localeCompare(b.tag));
  }, [evidenceTags, focusTags, knownExtras]);

  function rememberExtra(tag: string) {
    const key = signalTagKey(tag);
    if (!key) return;
    setKnownExtras((current) => {
      if (current.some((t) => signalTagKey(t) === key)) return current;
      const next = [...current, tag.trim()];
      writeKnownExtras(next);
      return next;
    });
  }

  function flagFromDraft() {
    const next = draft.trim().replace(/\s+/g, " ");
    if (!next) return;
    rememberExtra(next);
    setDraft("");
    startTransition(async () => {
      const result = await toggleSignalTagAction(next);
      if ("error" in result) return;
      // Ensure Flagged on (toggle might have disabled if already active)
      if (!result.active) {
        const again = await toggleSignalTagAction(next);
        if ("error" in again) return;
        setFocusTags(again.signalTags);
        onSignalTagsChange?.(again.signalTags);
      } else {
        setFocusTags(result.signalTags);
        onSignalTagsChange?.(result.signalTags);
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">{heading}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{hint}</p>
      </div>

      {rows.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {rows.map((row) => (
            <V2FlaggableTagChip
              key={signalTagKey(row.tag)}
              tag={row.tag}
              count={row.count}
              flagged={tagIsFlagged(row.tag, focusKeys)}
              onFlaggedChange={(next) => {
                setFocusTags(next);
                onSignalTagsChange?.(next);
                rememberExtra(row.tag);
              }}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-600">No Tags yet. Add Tags on a Note, or Flag a Tracker name below.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              flagFromDraft();
            }
          }}
          placeholder={addPlaceholder}
          disabled={pending}
          className="min-w-[12rem] flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 disabled:opacity-50"
          aria-label={addPlaceholder}
        />
        <button
          type="button"
          onClick={flagFromDraft}
          disabled={pending || !draft.trim()}
          className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-950/50 disabled:opacity-40"
        >
          {pending ? "…" : "⚑ Flag Tracker"}
        </button>
      </div>
    </div>
  );
}
