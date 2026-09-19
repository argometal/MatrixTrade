"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toggleSignalTagAction } from "@/app/argus/actions";
import { signalTagKey } from "@/lib/argus/signal-tags";
import { confirmTrackerConvert } from "@/lib/argus/tracker-confirm";
import { V2IntelHelpLink } from "./V2IntelHelpLink";
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

const KNOWN_EXTRAS_PREFIX = "argus:v2:tracker-known-extras:";

function extrasStorageKey(scopeId?: string): string {
  return `${KNOWN_EXTRAS_PREFIX}${scopeId?.trim() || "session"}`;
}

function readKnownExtras(scopeId?: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(extrasStorageKey(scopeId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
  } catch {
    return [];
  }
}

function writeKnownExtras(tags: string[], scopeId?: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(extrasStorageKey(scopeId), JSON.stringify(tags.slice(0, 200)));
  } catch {
    /* ignore quota */
  }
}

function normalizeDraft(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Tag ↔ Tracker manager.
 * Tags are inventory first; click a chip to Flag / Disable Tracker (optional).
 * Draft “Add Tag” remembers a name without Flagging — Flag is a separate action.
 * Durable Create/Delete live on Home Tags manager (same pipeline as binder Tag tabs).
 */
export function V2TrackerTogglePanel({
  evidenceTags,
  poolTags = [],
  signalTags,
  onSignalTagsChange,
  heading = "Tags · Trackers",
  /** @deprecated Explanations live behind ? — ignored when helpTopic is set. */
  hint: _hint,
  helpTopic = "tags-patterns",
  addPlaceholder = "Name a Tag…",
  /** When set, split inventory (“on this …”) from Topic pool and other Trackers. */
  surfaceLabel,
  emptyEvidenceHint,
  noteCta,
  /** Scope id for session drafts / disabled-Tracker memory (ORDER 001). */
  scopeId,
  /** Home flat mode: show session drafts in the chip list. */
  showSessionDrafts = false,
}: {
  /** Tags from Notes/emails on this surface — always listed. */
  evidenceTags: V2TrackerToggleTag[];
  /**
   * Topic-derived Tag pool (not necessarily on this surface yet).
   * Click to Flag as Tracker — Tag-first conversion from the Topic universe.
   */
  poolTags?: V2TrackerToggleTag[];
  signalTags: string[];
  onSignalTagsChange?: (next: string[]) => void;
  heading?: string;
  hint?: string;
  /** Contextual ? topic id (Help index). */
  helpTopic?: string;
  addPlaceholder?: string;
  surfaceLabel?: string;
  emptyEvidenceHint?: string;
  /** Optional CTA to put Tags on evidence via Note. */
  noteCta?: ReactNode;
  scopeId?: string;
  showSessionDrafts?: boolean;
}) {
  const router = useRouter();
  const [focusTags, setFocusTags] = useState(signalTags);
  /** Session-only names (keyed by scope) — never merged into persistent “Tags on this…”. */
  const [sessionDrafts, setSessionDrafts] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const prevFocusRef = useRef<string[]>(signalTags);

  useEffect(() => {
    setSessionDrafts(readKnownExtras(scopeId));
  }, [scopeId]);

  useEffect(() => {
    setFocusTags(signalTags);
  }, [signalTags]);

  /** When a Tracker is Disabled, keep the name in session drafts for re-Flag (scoped). */
  useEffect(() => {
    const prev = prevFocusRef.current;
    const nextKeys = new Set(focusTags.map(signalTagKey).filter(Boolean));
    const dropped = prev.filter((tag) => {
      const key = signalTagKey(tag);
      return key && !nextKeys.has(key);
    });
    prevFocusRef.current = focusTags;
    if (dropped.length === 0) return;
    setSessionDrafts((current) => {
      const byKey = new Map(current.map((t) => [signalTagKey(t), t] as const));
      for (const tag of dropped) {
        const key = signalTagKey(tag);
        if (key && !byKey.has(key)) byKey.set(key, tag.trim());
      }
      const next = [...byKey.values()];
      writeKnownExtras(next, scopeId);
      return next;
    });
  }, [focusTags, scopeId]);

  const focusKeys = useMemo(() => focusKeySet(focusTags), [focusTags]);

  const evidenceRows = useMemo(() => {
    const byKey = new Map<string, V2TrackerToggleTag>();
    for (const row of evidenceTags) {
      const key = signalTagKey(row.tag);
      if (!key) continue;
      byKey.set(key, { tag: row.tag.trim(), count: row.count });
    }
    return [...byKey.values()].sort((a, b) => {
      const ac = a.count ?? 0;
      const bc = b.count ?? 0;
      if (ac !== bc) return bc - ac;
      return a.tag.localeCompare(b.tag);
    });
  }, [evidenceTags]);

  const evidenceKeys = useMemo(
    () => new Set(evidenceRows.map((row) => signalTagKey(row.tag)).filter(Boolean)),
    [evidenceRows]
  );

  const poolRows = useMemo(() => {
    const byKey = new Map<string, V2TrackerToggleTag>();
    for (const row of poolTags) {
      const key = signalTagKey(row.tag);
      if (!key || evidenceKeys.has(key)) continue;
      byKey.set(key, { tag: row.tag.trim(), count: row.count });
    }
    return [...byKey.values()].sort((a, b) => a.tag.localeCompare(b.tag));
  }, [poolTags, evidenceKeys]);

  const poolKeys = useMemo(
    () => new Set(poolRows.map((row) => signalTagKey(row.tag)).filter(Boolean)),
    [poolRows]
  );

  const otherTrackerRows = useMemo(() => {
    const byKey = new Map<string, V2TrackerToggleTag>();
    for (const tag of focusTags) {
      const key = signalTagKey(tag);
      if (!key || evidenceKeys.has(key) || poolKeys.has(key)) continue;
      byKey.set(key, { tag: tag.trim() });
    }
    return [...byKey.values()].sort((a, b) => a.tag.localeCompare(b.tag));
  }, [focusTags, evidenceKeys, poolKeys]);

  const sessionRows = useMemo(() => {
    const byKey = new Map<string, V2TrackerToggleTag>();
    for (const tag of sessionDrafts) {
      const key = signalTagKey(tag);
      if (!key || evidenceKeys.has(key) || poolKeys.has(key)) continue;
      if (focusKeys.has(key)) continue;
      byKey.set(key, { tag: tag.trim() });
    }
    return [...byKey.values()].sort((a, b) => a.tag.localeCompare(b.tag));
  }, [sessionDrafts, evidenceKeys, poolKeys, focusKeys]);

  /** Flat list when not splitting by surface. */
  const flatRows = useMemo(() => {
    const byKey = new Map<string, V2TrackerToggleTag>();
    for (const row of evidenceRows) {
      byKey.set(signalTagKey(row.tag), row);
    }
    for (const row of poolRows) {
      const key = signalTagKey(row.tag);
      if (!byKey.has(key)) byKey.set(key, row);
    }
    for (const row of otherTrackerRows) {
      const key = signalTagKey(row.tag);
      if (!byKey.has(key)) byKey.set(key, row);
    }
    if (showSessionDrafts) {
      for (const row of sessionRows) {
        const key = signalTagKey(row.tag);
        if (!byKey.has(key)) byKey.set(key, row);
      }
    }
    return [...byKey.values()].sort((a, b) => a.tag.localeCompare(b.tag));
  }, [evidenceRows, poolRows, otherTrackerRows, sessionRows, showSessionDrafts]);

  function rememberSession(tag: string) {
    const key = signalTagKey(tag);
    if (!key) return;
    setSessionDrafts((current) => {
      if (current.some((t) => signalTagKey(t) === key)) return current;
      const next = [...current, tag.trim()];
      writeKnownExtras(next, scopeId);
      return next;
    });
  }

  function onChipFlaggedChange(tag: string, next: string[]) {
    setFocusTags(next);
    onSignalTagsChange?.(next);
    rememberSession(tag);
  }

  /** Session-only draft — not a persisted Tag on this binder. */
  function addTagFromDraft() {
    const next = normalizeDraft(draft);
    if (!next) return;
    rememberSession(next);
    setDraft("");
  }

  /** Flag as Tracker after naming (or Flag an existing name). One toggle only — never force-ON. */
  function flagFromDraft() {
    const next = normalizeDraft(draft);
    if (!next) return;
    const already = tagIsFlagged(next, focusKeys);
    if (already) {
      // Already a Tracker — do not invert via Flag button.
      setDraft("");
      return;
    }
    if (!confirmTrackerConvert(next, false)) return;
    rememberSession(next);
    setDraft("");
    startTransition(async () => {
      const result = await toggleSignalTagAction(next);
      if ("error" in result) return;
      setFocusTags(result.signalTags);
      onSignalTagsChange?.(result.signalTags);
      router.refresh();
    });
  }

  function renderChips(rows: V2TrackerToggleTag[]) {
    return (
      <div className="space-y-2">
        {rows.map((row) => (
          <V2FlaggableTagChip
            key={signalTagKey(row.tag)}
            tag={row.tag}
            count={row.count}
            flagged={tagIsFlagged(row.tag, focusKeys)}
            onFlaggedChange={(next) => onChipFlaggedChange(row.tag, next)}
          />
        ))}
      </div>
    );
  }

  const split = Boolean(surfaceLabel);
  const draftReady = Boolean(normalizeDraft(draft));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">{heading}</p>
        <V2IntelHelpLink topic={helpTopic} label={heading} />
      </div>

      {noteCta ? <div className="text-xs text-zinc-400">{noteCta}</div> : null}

      {split ? (
        <>
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-600/90">
              Tags on {surfaceLabel}
            </p>
            {evidenceRows.length > 0 ? (
              renderChips(evidenceRows)
            ) : (
              <p className="text-sm text-zinc-600">
                {emptyEvidenceHint ?? "No Tags on Notes here yet."}
              </p>
            )}
          </div>

          {poolRows.length > 0 ? (
            <div className="space-y-2 border-t border-zinc-800/80 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                From linked Topics
              </p>
              <p className="text-[11px] text-zinc-600">
                Topic Tag pool — click to Flag as Tracker (optional).
              </p>
              {renderChips(poolRows)}
            </div>
          ) : null}

          <div className="space-y-2 border-t border-zinc-800/80 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
              Other Trackers
            </p>
            {otherTrackerRows.length > 0 ? (
              renderChips(otherTrackerRows)
            ) : (
              <p className="text-sm text-zinc-600">
                No extra Trackers beyond Tags already listed above.
              </p>
            )}
          </div>

          {sessionRows.length > 0 ? (
            <div className="space-y-2 border-t border-zinc-800/80 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700/80">
                Session draft (not saved)
              </p>
              <p className="text-[11px] text-zinc-600">
                Local only for this binder — put on a Note to persist, or Flag as Tracker.
              </p>
              {renderChips(sessionRows)}
            </div>
          ) : null}
        </>
      ) : flatRows.length > 0 ? (
        renderChips(flatRows)
      ) : (
        <p className="text-sm text-zinc-600">No Tags yet.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTagFromDraft();
            }
          }}
          placeholder={addPlaceholder}
          disabled={pending}
          className="min-w-[12rem] flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 disabled:opacity-50"
          aria-label={addPlaceholder}
        />
        <button
          type="button"
          onClick={addTagFromDraft}
          disabled={pending || !draftReady}
          className="rounded-lg border border-teal-500/40 bg-teal-950/30 px-3 py-2 text-xs font-semibold text-teal-100 hover:bg-teal-950/50 disabled:opacity-40"
          title="Session draft only — not written to Notes"
        >
          Draft
        </button>
        <button
          type="button"
          onClick={flagFromDraft}
          disabled={pending || !draftReady}
          className="rounded-lg border border-rose-500/35 bg-rose-950/20 px-3 py-2 text-xs font-medium text-rose-200/90 hover:bg-rose-950/40 disabled:opacity-40"
          title="Optional — Flag this name as a journal Tracker"
        >
          {pending ? "…" : "Flag Tracker"}
        </button>
      </div>
    </div>
  );
}
