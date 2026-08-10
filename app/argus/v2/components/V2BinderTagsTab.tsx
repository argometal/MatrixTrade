"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toggleSignalTagAction } from "@/app/argus/actions";
import { confirmTrackerConvert } from "@/lib/argus/tracker-confirm";
import { signalTagKey } from "@/lib/argus/signal-tags";
import { V2IntelHelpLink } from "./V2IntelHelpLink";

export type V2BinderBranchTag = {
  tag: string;
  count: number;
};

export type V2BinderBranchGroup = {
  id: string;
  /** Column title — Event / Topic / Project / … */
  label: string;
  /** Optional entity name under the label */
  contextName?: string;
  href?: string;
  tags: V2BinderBranchTag[];
};

export type V2BinderTagsTabProps = {
  /** A — Tags attached to this binder only */
  attachedHeading: string;
  attachedHint: string;
  attachedTags: string[];
  attachedEditor: ReactNode;
  helpTopic?: string;

  /** B — Contextual neighborhood (structural IDs only) */
  branchHeading?: string;
  branchHint?: string;
  branchGroups: V2BinderBranchGroup[];
  branchEmptyHint?: string;
  onBrowseBranch?: () => void;
  browseBranchLabel?: string;

  /** D — Trackers relevant to attached ∪ branch (not full journal dump) */
  signalTags: string[];
  onSignalTagsChange?: (next: string[]) => void;
  manageTrackersHref?: string;

  /** Escape to global universe */
  universeHref?: string;
};

const PREVIEW = 5;

function focusKeySet(tags: string[]): Set<string> {
  return new Set(tags.map(signalTagKey).filter(Boolean));
}

export function V2BinderTagsTab({
  attachedHeading,
  attachedHint,
  attachedTags,
  attachedEditor,
  helpTopic = "tags-universe",
  branchHeading = "Tags in this branch",
  branchHint = "Tags used around this binder. Not attached here until you add them.",
  branchGroups,
  branchEmptyHint = "No contextual Tags yet — link a Topic or Project, or tag Notes.",
  onBrowseBranch,
  browseBranchLabel = "Browse branch",
  signalTags,
  onSignalTagsChange,
  manageTrackersHref = "/argus/v2?intel=tags",
  universeHref = "/argus/v2?intel=tags",
}: V2BinderTagsTabProps) {
  const router = useRouter();
  const [manageOpen, setManageOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [pendingTag, setPendingTag] = useState<string | null>(null);
  const focusKeys = useMemo(() => focusKeySet(signalTags), [signalTags]);

  const branchTagKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const group of branchGroups) {
      for (const row of group.tags) {
        const key = signalTagKey(row.tag);
        if (key) keys.add(key);
      }
    }
    return keys;
  }, [branchGroups]);

  const attachedKeys = useMemo(
    () => new Set(attachedTags.map(signalTagKey).filter(Boolean)),
    [attachedTags]
  );

  /** Trackers that touch this binder’s attached or branch vocabulary — not the whole journal. */
  const contextTrackers = useMemo(() => {
    return signalTags
      .map((tag) => tag.trim())
      .filter(Boolean)
      .filter((tag) => {
        const key = signalTagKey(tag);
        return key && (attachedKeys.has(key) || branchTagKeys.has(key));
      })
      .sort((a, b) => a.localeCompare(b));
  }, [signalTags, attachedKeys, branchTagKeys]);

  const visibleGroups = branchGroups.filter((g) => g.tags.length > 0 || g.href);
  const hasAnyBranchTags = branchGroups.some((g) => g.tags.length > 0);

  function toggleTracker(tag: string) {
    const flagged = focusKeys.has(signalTagKey(tag));
    if (!confirmTrackerConvert(tag, flagged)) return;
    setPendingTag(tag);
    startTransition(async () => {
      const result = await toggleSignalTagAction(tag);
      setPendingTag(null);
      if ("error" in result) return;
      onSignalTagsChange?.(result.signalTags);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* 1 — Attached */}
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
        <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-100">{attachedHeading}</h3>
              <V2IntelHelpLink topic={helpTopic} label="Help" />
            </div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">{attachedHint}</p>
          </div>
        </div>
        <div className="mt-3">{attachedEditor}</div>
        <p className="mt-3 text-[11px] tabular-nums text-zinc-600">
          {attachedTags.length} tag{attachedTags.length === 1 ? "" : "s"}
        </p>
      </section>

      {/* 2 — Branch */}
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4">
        <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-100">{branchHeading}</h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">{branchHint}</p>
          </div>
          {onBrowseBranch ? (
            <button
              type="button"
              onClick={onBrowseBranch}
              className="shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
            >
              {browseBranchLabel}
            </button>
          ) : null}
        </div>

        {!hasAnyBranchTags ? (
          <p className="mt-3 text-xs text-zinc-600">{branchEmptyHint}</p>
        ) : (
          <div
            className={`mt-3 grid gap-3 ${
              visibleGroups.length >= 3
                ? "sm:grid-cols-3"
                : visibleGroups.length === 2
                  ? "sm:grid-cols-2"
                  : "grid-cols-1"
            }`}
          >
            {visibleGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-lg border border-zinc-800/70 bg-zinc-900/40 px-3 py-2.5"
              >
                <div className="mb-2 flex flex-wrap items-baseline gap-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    {group.label}
                  </p>
                  {group.contextName ? (
                    group.href ? (
                      <Link
                        href={group.href}
                        className="truncate text-[11px] text-zinc-400 hover:text-violet-300"
                      >
                        {group.contextName}
                      </Link>
                    ) : (
                      <span className="truncate text-[11px] text-zinc-400">{group.contextName}</span>
                    )
                  ) : null}
                </div>
                {group.tags.length === 0 ? (
                  <p className="text-[11px] text-zinc-600">None yet</p>
                ) : (
                  <ul className="space-y-1">
                    {group.tags.slice(0, PREVIEW).map((row) => (
                      <li
                        key={row.tag}
                        className="flex items-center justify-between gap-2 text-[12px] text-zinc-300"
                      >
                        <span className="truncate">{row.tag}</span>
                        {row.count > 0 ? (
                          <span className="shrink-0 tabular-nums text-zinc-600">{row.count}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                {group.tags.length > PREVIEW ? (
                  <p className="mt-2 text-[10px] text-zinc-600">
                    +{group.tags.length - PREVIEW} more
                    {group.href ? (
                      <>
                        {" · "}
                        <Link href={group.href} className="text-zinc-400 hover:text-violet-300">
                          View
                        </Link>
                      </>
                    ) : null}
                  </p>
                ) : group.href && group.tags.length > 0 ? (
                  <Link
                    href={group.href}
                    className="mt-2 inline-block text-[10px] text-zinc-500 hover:text-violet-300"
                  >
                    Open →
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
          Not attached automatically — use Add Tag above to attach to this binder.
        </p>
      </section>

      {/* 3 — Trackers */}
      <section className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4">
        <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-100">Trackers</h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              What ARGUS is watching among Tags in this context. Flag is separate from attachment.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setManageOpen((v) => !v)}
            className="shrink-0 rounded-lg border border-amber-500/30 px-2.5 py-1.5 text-[11px] font-medium text-amber-100/90 hover:bg-amber-950/40"
          >
            {manageOpen ? "Hide" : "Manage Trackers"}
          </button>
        </div>

        {contextTrackers.length === 0 ? (
          <p className="mt-3 text-xs text-zinc-600">
            No Trackers on Tags in this context yet.
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Trackers in this context">
            {contextTrackers.map((tag) => (
              <li key={tag}>
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/40 bg-rose-950/40 px-2 py-1 text-[11px] font-medium text-amber-100">
                  <span aria-hidden>⚑</span>
                  {tag}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] tabular-nums text-zinc-600">
          {contextTrackers.length} tracker{contextTrackers.length === 1 ? "" : "s"} in context
        </p>

        {manageOpen ? (
          <div className="mt-3 space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
            <p className="text-[11px] text-zinc-500">
              Flag or disable Trackers for Tags attached or seen in this branch. Full journal list
              lives in Tags universe.
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {[...new Set([...attachedTags, ...branchGroups.flatMap((g) => g.tags.map((t) => t.tag))])]
                .sort((a, b) => a.localeCompare(b))
                .slice(0, 40)
                .map((tag) => {
                  const flagged = focusKeys.has(signalTagKey(tag));
                  const busy = pending && pendingTag === tag;
                  return (
                    <li key={tag}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggleTracker(tag)}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] disabled:opacity-40 ${
                          flagged
                            ? "border-amber-400/50 bg-rose-950/50 text-amber-100"
                            : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-amber-500/40 hover:text-amber-100"
                        }`}
                        title={flagged ? `Disable Tracker on ${tag}` : `Flag ${tag} as Tracker`}
                      >
                        {flagged ? "⚑" : "○"} {tag}
                      </button>
                    </li>
                  );
                })}
            </ul>
            <Link
              href={manageTrackersHref}
              className="inline-block text-[11px] font-medium text-amber-200/80 hover:text-amber-100"
            >
              All Trackers in Tags universe →
            </Link>
          </div>
        ) : null}
      </section>

      {/* 4 — Universe escape */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800/60 bg-zinc-950/30 px-4 py-3">
        <p className="max-w-xl text-xs leading-relaxed text-zinc-500">
          Explore the complete Tag universe — roles, usage, Patterns, and Trackers across the
          journal.
        </p>
        <Link
          href={universeHref}
          className="shrink-0 rounded-lg border border-violet-500/40 bg-violet-950/30 px-3 py-1.5 text-[11px] font-semibold text-violet-100 hover:bg-violet-950/50"
        >
          Go to Tags →
        </Link>
      </section>
    </div>
  );
}
