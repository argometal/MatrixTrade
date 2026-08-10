"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toggleSignalTagAction } from "@/app/argus/actions";
import { confirmTrackerConvert } from "@/lib/argus/tracker-confirm";
import { signalTagKey } from "@/lib/argus/signal-tags";

export type V2BinderBranchTag = {
  tag: string;
  count: number;
  /** Navigable destination for this Tag in context */
  href?: string;
};

export type V2BinderBranchGroup = {
  id: string;
  label: string;
  contextName?: string;
  href?: string;
  tags: V2BinderBranchTag[];
  /** Visual accent for column header icon */
  tone?: "event" | "topic" | "project" | "default";
};

export type V2BinderTagsTabProps = {
  attachedHeading: string;
  attachedBadge?: string;
  attachedHint: string;
  attachedTags: string[];
  /** Optional link target for each attached Tag name */
  attachedTagHref?: (tag: string) => string | undefined;
  attachedEditor: ReactNode;
  helpTopic?: string;

  branchHeading?: string;
  branchBadge?: string;
  branchHint?: string;
  branchGroups: V2BinderBranchGroup[];
  branchEmptyHint?: string;
  onBrowseBranch?: () => void;
  browseBranchLabel?: string;

  signalTags: string[];
  onSignalTagsChange?: (next: string[]) => void;
  manageTrackersHref?: string;

  universeHref?: string;
  /** Show compact about rail on wide screens (render-style). */
  showAboutRail?: boolean;
};

const PREVIEW = 40;

function focusKeySet(tags: string[]): Set<string> {
  return new Set(tags.map(signalTagKey).filter(Boolean));
}

function StepBadge({
  n,
  tone,
}: {
  n: number;
  tone: "violet" | "sky" | "amber";
}) {
  const ring =
    tone === "violet"
      ? "bg-violet-600 text-white shadow-[0_0_0_3px_rgba(139,92,246,0.25)]"
      : tone === "sky"
        ? "bg-sky-600 text-white shadow-[0_0_0_3px_rgba(14,165,233,0.25)]"
        : "bg-amber-500 text-zinc-950 shadow-[0_0_0_3px_rgba(245,158,11,0.25)]";
  return (
    <span
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${ring}`}
      aria-hidden
    >
      {n}
    </span>
  );
}

function PillLabel({ children, tone }: { children: ReactNode; tone: "violet" | "sky" | "amber" }) {
  const cls =
    tone === "violet"
      ? "border-violet-500/40 bg-violet-950/50 text-violet-200"
      : tone === "sky"
        ? "border-sky-500/40 bg-sky-950/40 text-sky-200"
        : "border-amber-500/40 bg-amber-950/40 text-amber-100";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {children}
    </span>
  );
}

function groupIcon(tone: V2BinderBranchGroup["tone"]): string {
  if (tone === "event") return "📅";
  if (tone === "topic") return "⚙";
  if (tone === "project") return "📁";
  return "🏷";
}

function groupAccent(tone: V2BinderBranchGroup["tone"]): string {
  if (tone === "event") return "border-violet-500/30 bg-violet-950/20";
  if (tone === "topic") return "border-emerald-500/30 bg-emerald-950/15";
  if (tone === "project") return "border-orange-500/30 bg-orange-950/15";
  return "border-zinc-800 bg-zinc-900/40";
}

export function V2BinderTagsTab({
  attachedHeading,
  attachedBadge = "What kind is this?",
  attachedHint,
  attachedTags,
  attachedTagHref,
  attachedEditor,
  branchHeading = "Tags in this branch",
  branchBadge = "What exists in context?",
  branchHint = "Tags used in the context of this binder — not attached until you Add Tag.",
  branchGroups,
  branchEmptyHint = "No contextual Tags yet — link a Topic or Project, or tag Notes.",
  onBrowseBranch,
  browseBranchLabel = "Browse branch",
  signalTags,
  onSignalTagsChange,
  manageTrackersHref = "/argus/v2?intel=tags",
  universeHref = "/argus/v2?intel=tags",
  showAboutRail = true,
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

  /** Journal Trackers not yet on this binder/branch — still recall them (legacy Event Signals). */
  const otherTrackers = useMemo(() => {
    const contextKeys = new Set(
      [...contextTrackers].map(signalTagKey).filter(Boolean)
    );
    return signalTags
      .map((tag) => tag.trim())
      .filter(Boolean)
      .filter((tag) => {
        const key = signalTagKey(tag);
        return key && !contextKeys.has(key);
      })
      .sort((a, b) => a.localeCompare(b));
  }, [signalTags, contextTrackers]);

  const manageInventory = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const tag of attachedTags) {
      const key = signalTagKey(tag);
      if (key) byKey.set(key, tag.trim());
    }
    for (const group of branchGroups) {
      for (const row of group.tags) {
        const key = signalTagKey(row.tag);
        if (key && !byKey.has(key)) byKey.set(key, row.tag.trim());
      }
    }
    for (const tag of signalTags) {
      const key = signalTagKey(tag);
      if (key && !byKey.has(key)) byKey.set(key, tag.trim());
    }
    return [...byKey.values()].sort((a, b) => a.localeCompare(b)).slice(0, 60);
  }, [attachedTags, branchGroups, signalTags]);

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

  const main = (
    <div className="space-y-4">
      {/* 1 — Attached */}
      <section className="rounded-2xl border border-violet-500/25 bg-gradient-to-b from-violet-950/30 to-zinc-950/80 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex items-start gap-2.5">
            <StepBadge n={1} tone="violet" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-50">
                  {attachedHeading}
                </h3>
                <PillLabel tone="violet">{attachedBadge}</PillLabel>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{attachedHint}</p>
            </div>
          </div>
        </div>

        <div className="mt-4">{attachedEditor}</div>

        {/* Open-links for attached Tags (Links-style rows). Skip when editor already lists them. */}
        {attachedTags.length > 0 && attachedTagHref && !attachedEditor ? (
          <ul className="mt-3 flex flex-col gap-1.5" aria-label="Open attached Tags">
            {attachedTags.map((tag) => {
              const href = attachedTagHref(tag);
              if (!href) return null;
              return (
                <li key={`link-${tag}`}>
                  <Link
                    href={href}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-violet-500/30 bg-violet-950/40 px-2.5 py-1.5 text-[12px] text-violet-200/90 hover:border-violet-400/50 hover:text-violet-50"
                    title={`Open ${tag}`}
                  >
                    <span className="min-w-0 truncate">#{tag}</span>
                    <span className="shrink-0 text-violet-300/80" aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}

        <p className="mt-3 text-[11px] tabular-nums text-zinc-500">
          {attachedTags.length} tag{attachedTags.length === 1 ? "" : "s"}
        </p>
      </section>

      {/* 2 — Branch */}
      <section className="rounded-2xl border border-sky-500/20 bg-gradient-to-b from-sky-950/20 to-zinc-950/80 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex items-start gap-2.5">
            <StepBadge n={2} tone="sky" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-50">
                  {branchHeading}
                </h3>
                <PillLabel tone="sky">{branchBadge}</PillLabel>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{branchHint}</p>
            </div>
          </div>
          {onBrowseBranch ? (
            <button
              type="button"
              onClick={onBrowseBranch}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-sky-500/35 bg-sky-950/30 px-2.5 py-1.5 text-[11px] font-semibold text-sky-100 hover:bg-sky-950/50"
            >
              {browseBranchLabel}
              <span aria-hidden>↗</span>
            </button>
          ) : null}
        </div>

        {!hasAnyBranchTags ? (
          <p className="mt-4 text-xs text-zinc-600">{branchEmptyHint}</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3">
            {visibleGroups.map((group) => {
              const tone = group.tone ?? (group.id as V2BinderBranchGroup["tone"]) ?? "default";
              return (
                <div
                  key={group.id}
                  className={`rounded-xl border px-3 py-3 ${groupAccent(tone)}`}
                >
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="text-base" aria-hidden>
                      {groupIcon(tone)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-zinc-100">{group.label}</p>
                      {group.contextName ? (
                        group.href ? (
                          <Link
                            href={group.href}
                            className="block truncate text-[10px] text-zinc-400 hover:text-sky-200"
                          >
                            {group.contextName}
                          </Link>
                        ) : (
                          <p className="truncate text-[10px] text-zinc-500">{group.contextName}</p>
                        )
                      ) : null}
                    </div>
                  </div>
                  {group.tags.length === 0 ? (
                    <p className="text-[11px] text-zinc-600">None yet</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {group.tags.slice(0, PREVIEW).map((row) => (
                        <li key={row.tag}>
                          {row.href ? (
                            <Link
                              href={row.href}
                              className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-[12px] text-zinc-200 hover:border-sky-500/40 hover:text-sky-100"
                              title={`Open ${row.tag}`}
                            >
                              <span className="min-w-0 truncate font-medium">{row.tag}</span>
                              {row.count > 0 ? (
                                <span className="shrink-0 rounded bg-zinc-950/50 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-500">
                                  {row.count}
                                </span>
                              ) : (
                                <span className="shrink-0 text-sky-300/80" aria-hidden>
                                  →
                                </span>
                              )}
                            </Link>
                          ) : (
                            <span className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-[12px] text-zinc-300">
                              <span className="min-w-0 truncate">{row.tag}</span>
                              {row.count > 0 ? (
                                <span className="shrink-0 rounded bg-zinc-950/50 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-500">
                                  {row.count}
                                </span>
                              ) : null}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {group.tags.length > PREVIEW ? (
                    <p className="mt-2.5 text-[10px] text-zinc-500">
                      View all {group.tags.length}
                      {group.href ? (
                        <>
                          {" "}
                          <Link href={group.href} className="text-sky-300/80 hover:text-sky-200">
                            →
                          </Link>
                        </>
                      ) : null}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-zinc-500">
          <span aria-hidden className="mt-0.5 text-sky-400/80">
            ⓘ
          </span>
          These are not automatically attached. Use + Add Tag to attach to this binder.
        </p>
      </section>

      {/* 3 — Trackers */}
      <section className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-950/25 to-zinc-950/80 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex items-start gap-2.5">
            <StepBadge n={3} tone="amber" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-50">
                  Trackers
                </h3>
                <PillLabel tone="amber">What ARGUS is watching</PillLabel>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                These Tags are being tracked. ARGUS will surface related content.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setManageOpen((v) => !v)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-950/40 px-2.5 py-1.5 text-[11px] font-semibold text-amber-100 hover:bg-amber-950/60"
          >
            {manageOpen ? "Hide" : "Manage Trackers"}
            <span aria-hidden>↗</span>
          </button>
        </div>

        {contextTrackers.length === 0 && otherTrackers.length === 0 ? (
          <p className="mt-4 text-xs text-zinc-600">No Trackers on Tags in this context yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {contextTrackers.length > 0 ? (
              <ul className="flex flex-col gap-1.5" aria-label="Trackers in this context">
                {contextTrackers.map((tag) => (
                  <li key={tag}>
                    <span className="flex w-full items-center gap-2 rounded-lg border border-amber-400/50 bg-zinc-950/60 px-2.5 py-1.5 text-[12px] font-semibold text-amber-100">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden />
                      <span className="min-w-0 truncate">{tag}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {otherTrackers.length > 0 ? (
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-zinc-500">
                  Other journal Trackers
                </p>
                <ul className="flex flex-col gap-1.5" aria-label="Other journal Trackers">
                  {otherTrackers.map((tag) => (
                    <li key={tag}>
                      <span className="flex w-full items-center gap-2 rounded-lg border border-amber-400/30 bg-zinc-950/40 px-2.5 py-1.5 text-[12px] text-amber-100/90">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70" aria-hidden />
                        <span className="min-w-0 truncate">{tag}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
        <p className="mt-3 text-[11px] tabular-nums text-zinc-500">
          {contextTrackers.length + otherTrackers.length} tracker
          {contextTrackers.length + otherTrackers.length === 1 ? "" : "s"}
        </p>

        {manageOpen ? (
          <div className="mt-3 space-y-2 rounded-xl border border-amber-500/20 bg-zinc-950/70 p-3">
            <p className="text-[11px] text-zinc-500">
              Flag or disable Trackers for Tags attached, seen in this branch, or already tracked in
              the journal.
            </p>
            <ul className="flex flex-col gap-1.5">
              {manageInventory.map((tag) => {
                  const flagged = focusKeys.has(signalTagKey(tag));
                  const busy = pending && pendingTag === tag;
                  return (
                    <li key={tag}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggleTracker(tag)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[12px] disabled:opacity-40 ${
                          flagged
                            ? "border-amber-400/60 bg-amber-950/50 text-amber-100"
                            : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-amber-500/40 hover:text-amber-100"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${flagged ? "bg-amber-400" : "bg-zinc-600"}`}
                            aria-hidden
                          />
                          <span className="truncate">{tag}</span>
                        </span>
                        <span className="shrink-0 text-[10px] uppercase tracking-wide text-zinc-500">
                          {flagged ? "Flagged" : "Flag"}
                        </span>
                      </button>
                    </li>
                  );
                })}
            </ul>
            <Link
              href={manageTrackersHref}
              className="inline-block text-[11px] font-medium text-amber-200/90 hover:text-amber-100"
            >
              All Trackers in Tags universe →
            </Link>
          </div>
        ) : null}
      </section>

      {/* 4 — Universe */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-950/35 via-zinc-950/80 to-zinc-950/60 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-950/50 text-lg"
            aria-hidden
          >
            ✳
          </span>
          <p className="text-xs leading-relaxed text-zinc-400">
            Explore the complete Tag universe. See all Tags, statistics, relationships and Patterns
            across your journal.
          </p>
        </div>
        <Link
          href={universeHref}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-violet-400/50 bg-violet-600/90 px-3 py-2 text-[11px] font-semibold text-white hover:bg-violet-500"
        >
          Go to Tags
          <span aria-hidden>↗</span>
        </Link>
      </section>
    </div>
  );

  if (!showAboutRail) return main;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
      {main}
      <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            About this tab
          </p>
          <ul className="mt-3 space-y-2.5 text-xs text-zinc-400">
            <li className="flex gap-2">
              <span className="text-violet-300" aria-hidden>
                🏷
              </span>
              <span>
                <span className="font-medium text-zinc-200">Tags classify</span> — attached to this
                binder.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-300" aria-hidden>
                👁
              </span>
              <span>
                <span className="font-medium text-zinc-200">Trackers watch</span> — Flag on a Tag
                name.
              </span>
            </li>
            <li className="text-[11px] leading-relaxed text-zinc-500">
              Branch Tags show context and are not attached until you Add Tag.
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Legend</p>
          <ul className="mt-3 space-y-1.5 text-[11px] text-zinc-400">
            <li>
              <span className="text-violet-300">●</span> Event / binder Tags (attached)
            </li>
            <li>
              <span className="text-sky-300">●</span> Branch Tags (contextual)
            </li>
            <li>
              <span className="text-amber-300">●</span> Trackers (watched)
            </li>
            <li>
              <span className="text-violet-200">●</span> Universe (global)
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
