"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
  useTransition,
  type DragEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toggleSignalTagAction } from "@/app/argus/actions";
import { confirmTrackerConvert } from "@/lib/argus/tracker-confirm";
import { signalTagKey } from "@/lib/argus/signal-tags";
import { V2IntelHelpLink } from "@/app/argus/v2/components/V2IntelHelpLink";
import {
  TAG_MANAGE_LIST_CLASS,
  TAG_MANAGE_ROW_CLASS,
  TAG_MANAGE_ROW_TRACKER_CLASS,
} from "@/app/argus/v2/components/tag-manage-list";

/** Drag payload for branch → Linked binder Tags. */
export const ARGUS_BINDER_TAG_MIME = "application/x-argus-binder-tag";

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

/** Topic Tags provenance: Topic-direct evidence + per-Event binder vs Note tags. */
export type V2BinderTagProvenance = {
  directHeading?: string;
  directBadge?: string;
  directEmptyHint?: string;
  directTags: V2BinderBranchTag[];
  byEventHeading?: string;
  eventsEmptyHint?: string;
  events: Array<{
    id: string;
    name: string;
    dateLabel?: string;
    href: string;
    eventTags: V2BinderBranchTag[];
    noteTags: V2BinderBranchTag[];
  }>;
};

export type V2BinderTagsTabProps = {
  attachedHeading: string;
  attachedBadge?: string;
  /** @deprecated Prefer helpTopic — inline hints are hidden when help is wired. */
  attachedHint?: string;
  attachedTags: string[];
  /** Optional link target for each attached Tag name */
  attachedTagHref?: (tag: string) => string | undefined;
  attachedEditor: ReactNode;
  /** One contextual ? for the whole Tags tab (preferred over inline paragraphs). */
  helpTopic?: string;
  /**
   * When set, branch Tag rows expose a drag handle and section 1 accepts drops
   * to attach that Tag to the binder (Event Tags / Topic Tags editor).
   */
  onAttachTag?: (tag: string) => void;

  branchHeading?: string;
  branchBadge?: string;
  branchHint?: string;
  /** Flat branch groups (Event/Project). Ignored when `provenance` is set. */
  branchGroups?: V2BinderBranchGroup[];
  branchEmptyHint?: string;
  onBrowseBranch?: () => void;
  browseBranchLabel?: string;
  /**
   * Topic Tags provenance layout: Tags in this Topic + By Event (Event Tags / On Notes).
   * Replaces the flat branch section when provided.
   */
  provenance?: V2BinderTagProvenance;
  /**
   * Branch group ids that count as this entity’s ownership vocabulary for the
   * Trackers section (definition D). Neighborhood groups (e.g. Event→Topic) are excluded.
   * Ignored when `provenance` is set (Topic uses attached + direct only).
   * Default: ["event", "project"] — Notes-on-entity groups.
   */
  ownershipBranchGroupIds?: string[];

  signalTags: string[];
  onSignalTagsChange?: (next: string[]) => void;
  manageTrackersHref?: string;

  universeHref?: string;
  /** Show compact about rail on wide screens (off by default — help lives in ?). */
  showAboutRail?: boolean;
};

const PREVIEW = 40;

function focusKeySet(tags: string[]): Set<string> {
  return new Set(tags.map(signalTagKey).filter(Boolean));
}

function DisclosureChevron({ open }: { open: boolean }) {
  return (
    <span
      className={`inline-block text-[10px] text-zinc-500 transition-transform ${open ? "rotate-90" : ""}`}
      aria-hidden
    >
      ▶
    </span>
  );
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

function TagManageRows({
  tags,
  emptyHint,
  focusKeys,
  draggableToAttach = false,
}: {
  tags: V2BinderBranchTag[];
  emptyHint?: string;
  focusKeys: Set<string>;
  /** Show drag handle — drop onto Linked section when onAttachTag is wired. */
  draggableToAttach?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  if (tags.length === 0) {
    return <p className="text-[11px] text-zinc-600">{emptyHint ?? "None yet"}</p>;
  }
  const truncated = tags.length > PREVIEW && !showAll;
  const visible = truncated ? tags.slice(0, PREVIEW) : tags;
  return (
    <div>
      <ul className={TAG_MANAGE_LIST_CLASS}>
        {visible.map((row) => {
          const tracked = focusKeys.has(signalTagKey(row.tag));
          const dragHandle = draggableToAttach ? (
            <span
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(ARGUS_BINDER_TAG_MIME, row.tag);
                event.dataTransfer.setData("text/plain", row.tag);
                event.dataTransfer.effectAllowed = "copy";
              }}
              className="flex h-9 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 active:cursor-grabbing"
              title={`Drag “${row.tag}” to Linked`}
              aria-label={`Drag ${row.tag} to Linked`}
              onClick={(event) => event.preventDefault()}
            >
              <span aria-hidden className="text-[11px] leading-none">
                ⠿
              </span>
            </span>
          ) : null;
          const inner = (
            <>
              {dragHandle}
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  tracked ? "bg-amber-500/20 text-amber-100" : "bg-violet-600/20 text-violet-200"
                }`}
                aria-hidden
              >
                {tracked ? "⚑" : "#"}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold text-zinc-100">{row.tag}</span>
              {tracked ? (
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">
                  Tracked
                </span>
              ) : null}
              {row.count > 0 ? (
                <span className="shrink-0 tabular-nums text-xs text-violet-300">{row.count}</span>
              ) : row.href && !tracked ? (
                <span className="shrink-0 text-zinc-500" aria-hidden>
                  →
                </span>
              ) : null}
            </>
          );
          return (
            <li key={row.tag}>
              {row.href ? (
                <Link
                  href={row.href}
                  className={tracked ? TAG_MANAGE_ROW_TRACKER_CLASS : TAG_MANAGE_ROW_CLASS}
                  title={
                    tracked
                      ? `${row.tag} · Tracked`
                      : draggableToAttach
                        ? `Open ${row.tag} · drag ⠿ to Linked`
                        : `Open ${row.tag}`
                  }
                >
                  {inner}
                </Link>
              ) : (
                <span
                  className={tracked ? TAG_MANAGE_ROW_TRACKER_CLASS : TAG_MANAGE_ROW_CLASS}
                  title={
                    tracked
                      ? `${row.tag} · Tracked`
                      : draggableToAttach
                        ? `Drag ⠿ to Linked`
                        : undefined
                  }
                >
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {tags.length > PREVIEW ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 text-[11px] font-medium text-sky-300/90 hover:text-sky-200"
        >
          {showAll ? "Show less" : `Show all ${tags.length} tags`}
        </button>
      ) : null}
    </div>
  );
}

export function V2BinderTagsTab({
  attachedHeading,
  attachedBadge = "Linked",
  attachedHint,
  attachedTags,
  attachedTagHref,
  attachedEditor,
  helpTopic,
  onAttachTag,
  branchHeading = "Tags in this branch",
  branchBadge = "Branch",
  branchHint,
  branchGroups = [],
  branchEmptyHint = "No contextual Tags yet.",
  onBrowseBranch,
  browseBranchLabel = "Browse branch",
  provenance,
  ownershipBranchGroupIds = ["event", "project"],
  signalTags,
  onSignalTagsChange,
  manageTrackersHref = "/argus/v2?intel=tags",
  universeHref = "/argus/v2?intel=tags",
  showAboutRail = false,
}: V2BinderTagsTabProps) {
  const router = useRouter();
  const [manageOpen, setManageOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [pendingTag, setPendingTag] = useState<string | null>(null);
  /** Topic Tags → By Event: each Event starts collapsed so large binders don't obscure the rest. */
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(() => new Set());
  /** Event Tags → Branch groups: each group starts collapsed; toggle independently. */
  const [expandedBranchIds, setExpandedBranchIds] = useState<Set<string>>(() => new Set());
  const [dropActive, setDropActive] = useState(false);
  const focusKeys = useMemo(() => focusKeySet(signalTags), [signalTags]);

  function readDroppedTag(event: DragEvent): string | null {
    const mime = event.dataTransfer.getData(ARGUS_BINDER_TAG_MIME).trim();
    if (mime) return mime;
    const plain = event.dataTransfer.getData("text/plain").trim();
    return plain || null;
  }

  function handleAttachDragOver(event: DragEvent) {
    if (!onAttachTag) return;
    const types = Array.from(event.dataTransfer.types);
    if (!types.includes(ARGUS_BINDER_TAG_MIME) && !types.includes("text/plain")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDropActive(true);
  }

  function handleAttachDragLeave(event: DragEvent) {
    if (!onAttachTag) return;
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) return;
    setDropActive(false);
  }

  function handleAttachDrop(event: DragEvent) {
    if (!onAttachTag) return;
    event.preventDefault();
    setDropActive(false);
    const tag = readDroppedTag(event);
    if (tag) onAttachTag(tag);
  }

  function toggleEventExpanded(id: string) {
    setExpandedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleBranchExpanded(id: string) {
    setExpandedBranchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /**
   * Definition D ownership vocabulary for Trackers section:
   * binder + direct evidence only. Topic provenance excludes By Event Tags
   * (⚑ stays on Event rows; Topic does not inherit Event Tracker ownership).
   */
  const ownershipTagKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const tag of attachedTags) {
      const key = signalTagKey(tag);
      if (key) keys.add(key);
    }
    if (provenance) {
      for (const row of provenance.directTags) {
        const key = signalTagKey(row.tag);
        if (key) keys.add(key);
      }
      return keys;
    }
    const owned = new Set(ownershipBranchGroupIds);
    for (const group of branchGroups) {
      if (!owned.has(group.id)) continue;
      for (const row of group.tags) {
        const key = signalTagKey(row.tag);
        if (key) keys.add(key);
      }
    }
    return keys;
  }, [attachedTags, branchGroups, ownershipBranchGroupIds, provenance]);

  const contextTrackers = useMemo(() => {
    return signalTags
      .map((tag) => tag.trim())
      .filter(Boolean)
      .filter((tag) => {
        const key = signalTagKey(tag);
        return key && ownershipTagKeys.has(key);
      })
      .sort((a, b) => a.localeCompare(b));
  }, [signalTags, ownershipTagKeys]);

  /** Journal Trackers not on this entity’s ownership vocabulary — recall only. */
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
    if (provenance) {
      for (const row of provenance.directTags) {
        const key = signalTagKey(row.tag);
        if (key && !byKey.has(key)) byKey.set(key, row.tag.trim());
      }
      for (const event of provenance.events) {
        for (const row of [...event.eventTags, ...event.noteTags]) {
          const key = signalTagKey(row.tag);
          if (key && !byKey.has(key)) byKey.set(key, row.tag.trim());
        }
      }
    } else {
      for (const group of branchGroups) {
        for (const row of group.tags) {
          const key = signalTagKey(row.tag);
          if (key && !byKey.has(key)) byKey.set(key, row.tag.trim());
        }
      }
    }
    for (const tag of signalTags) {
      const key = signalTagKey(tag);
      if (key && !byKey.has(key)) byKey.set(key, tag.trim());
    }
    return [...byKey.values()].sort((a, b) => a.localeCompare(b)).slice(0, 60);
  }, [attachedTags, branchGroups, provenance, signalTags]);

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
    <div className="space-y-3 sm:space-y-4">
      {/* 1 — Tags linked to this binder (editor list is the human-facing inventory) */}
      <section
        className={`rounded-2xl border bg-gradient-to-b p-3 sm:p-4 ${
          dropActive
            ? "border-violet-400/70 from-violet-900/40 to-zinc-950/80 ring-2 ring-violet-500/40"
            : "border-violet-500/25 from-violet-950/30 to-zinc-950/80"
        }`}
        onDragOver={handleAttachDragOver}
        onDragLeave={handleAttachDragLeave}
        onDrop={handleAttachDrop}
        aria-label={
          onAttachTag
            ? `${attachedHeading} — drop zone for branch Tags`
            : attachedHeading
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <StepBadge n={1} tone="violet" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-50">
              {attachedHeading}
            </h3>
            <PillLabel tone="violet">{attachedBadge}</PillLabel>
          </div>
          {helpTopic ? <V2IntelHelpLink topic={helpTopic} label="Tags" /> : null}
        </div>
        {!helpTopic && attachedHint ? (
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{attachedHint}</p>
        ) : null}
        {onAttachTag ? (
          <p className="mt-1.5 text-[11px] text-violet-300/80">
            {dropActive
              ? "Drop to link this Tag — then Save Tags."
              : "Drag ⠿ from Tags in this branch onto this section to link."}
          </p>
        ) : null}

        <div className="mt-3">{attachedEditor}</div>

        <p className="mt-2 text-[11px] tabular-nums text-zinc-500">
          {attachedTags.length} linked tag{attachedTags.length === 1 ? "" : "s"}
        </p>
      </section>

      {/* 2 — Branch (legacy) OR Tags in this Topic + By Event (provenance) */}
      {provenance ? (
        <>
          <section className="rounded-2xl border border-sky-500/20 bg-gradient-to-b from-sky-950/20 to-zinc-950/80 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StepBadge n={2} tone="sky" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-50">
                {provenance.directHeading ?? "Tags in this Topic"}
              </h3>
              <PillLabel tone="sky">{provenance.directBadge ?? "Evidence"}</PillLabel>
            </div>
            <div className="mt-3">
              <TagManageRows
                tags={provenance.directTags}
                focusKeys={focusKeys}
                emptyHint={
                  provenance.directEmptyHint ??
                  "No Tags on Notes or emails linked directly to this Topic."
                }
              />
            </div>
            {provenance.directTags.length > 0 ? (
              <p className="mt-2 text-[11px] tabular-nums text-zinc-500">
                {provenance.directTags.length} tag
                {provenance.directTags.length === 1 ? "" : "s"} on Topic evidence
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-violet-500/20 bg-gradient-to-b from-violet-950/20 to-zinc-950/80 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StepBadge n={3} tone="violet" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-50">
                {provenance.byEventHeading ?? "By Event"}
              </h3>
              <PillLabel tone="violet">Linked</PillLabel>
            </div>

            {provenance.events.length === 0 ? (
              <p className="mt-3 text-xs text-zinc-600">
                {provenance.eventsEmptyHint ?? "No linked Events yet."}
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {provenance.events.length > 1 ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedEventIds(new Set(provenance.events.map((event) => event.id)))
                      }
                      className="text-[11px] font-medium text-violet-300/90 hover:text-violet-200"
                    >
                      Expand all
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedEventIds(new Set())}
                      className="text-[11px] font-medium text-zinc-500 hover:text-zinc-300"
                    >
                      Collapse all
                    </button>
                  </div>
                ) : null}
                {provenance.events.map((event) => {
                  const open = expandedEventIds.has(event.id);
                  const tagCount = event.eventTags.length + event.noteTags.length;
                  return (
                    <div
                      key={event.id}
                      className={`rounded-xl border px-3 py-2.5 ${groupAccent("event")}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => toggleEventExpanded(event.id)}
                          className="flex min-w-0 flex-1 items-start gap-2 text-left"
                          aria-expanded={open}
                        >
                          <DisclosureChevron open={open} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-100">{event.name}</p>
                            <p className="mt-0.5 text-[11px] tabular-nums text-zinc-500">
                              {event.dateLabel ? `${event.dateLabel} · ` : ""}
                              {tagCount} tag{tagCount === 1 ? "" : "s"}
                              {open ? "" : " — expand to review"}
                            </p>
                          </div>
                        </button>
                        <Link
                          href={event.href}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-violet-500/35 bg-violet-950/40 px-2.5 py-1.5 text-[11px] font-semibold text-violet-100 hover:bg-violet-950/60"
                        >
                          Open Event
                          <span aria-hidden>→</span>
                        </Link>
                      </div>

                      {open ? (
                        <div className="mt-3 space-y-3 border-t border-violet-500/20 pt-3">
                          <div>
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                              Event Tags
                            </p>
                            <TagManageRows
                              tags={event.eventTags}
                              focusKeys={focusKeys}
                              emptyHint="No Event Tags on this binder."
                            />
                          </div>
                          <div>
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                              On Notes
                            </p>
                            <TagManageRows
                              tags={event.noteTags}
                              focusKeys={focusKeys}
                              emptyHint="No Tags on Notes for this Event."
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-sky-500/20 bg-gradient-to-b from-sky-950/20 to-zinc-950/80 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <StepBadge n={2} tone="sky" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-50">
                {branchHeading}
              </h3>
              <PillLabel tone="sky">{branchBadge}</PillLabel>
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
          {!helpTopic && branchHint ? (
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{branchHint}</p>
          ) : null}

          {!hasAnyBranchTags ? (
            <p className="mt-3 text-xs text-zinc-600">{branchEmptyHint}</p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-2">
              {visibleGroups.map((group) => {
                const tone = group.tone ?? (group.id as V2BinderBranchGroup["tone"]) ?? "default";
                const open = expandedBranchIds.has(group.id);
                return (
                  <div
                    key={group.id}
                    className={`rounded-xl border px-3 py-2.5 ${groupAccent(tone)}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleBranchExpanded(group.id)}
                      className="flex w-full items-center gap-2 text-left"
                      aria-expanded={open}
                    >
                      <DisclosureChevron open={open} />
                      <span className="text-base" aria-hidden>
                        {groupIcon(tone)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-zinc-100">{group.label}</p>
                        {group.contextName ? (
                          <p className="truncate text-[10px] text-zinc-500">{group.contextName}</p>
                        ) : null}
                        <p className="mt-0.5 text-[10px] tabular-nums text-zinc-500">
                          {group.tags.length} tag{group.tags.length === 1 ? "" : "s"}
                          {open ? "" : " — expand to review"}
                        </p>
                      </div>
                    </button>
                    {open ? (
                      <div className="mt-2.5 border-t border-zinc-800/60 pt-2.5">
                        {group.href && group.contextName ? (
                          <Link
                            href={group.href}
                            className="mb-2 block truncate text-[10px] text-sky-300/90 hover:text-sky-200"
                          >
                            {group.contextName} →
                          </Link>
                        ) : null}
                        <TagManageRows
                          tags={group.tags}
                          focusKeys={focusKeys}
                          emptyHint="None yet"
                          draggableToAttach={Boolean(onAttachTag)}
                        />
                        {group.tags.length > PREVIEW && group.href ? (
                          <p className="mt-2.5 text-[10px] text-zinc-500">
                            Open binder{" "}
                            <Link href={group.href} className="text-sky-300/80 hover:text-sky-200">
                              →
                            </Link>
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Trackers — secondary; step 4 with provenance, step 3 otherwise */}
      <section className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-950/25 to-zinc-950/80 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <StepBadge n={provenance ? 4 : 3} tone="amber" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-50">
              Trackers
            </h3>
            <PillLabel tone="amber">Watching</PillLabel>
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

        <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
          Journal Flags that appear on this binder or its direct evidence. Branch
          suggestions nearby do not count. Flag / Disable only via Manage Trackers.
        </p>

        {contextTrackers.length === 0 && otherTrackers.length === 0 ? (
          <p className="mt-4 text-xs text-zinc-600">
            No journal Flags intersect this entity’s Tags yet.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {contextTrackers.length > 0 ? (
              <ul className={TAG_MANAGE_LIST_CLASS} aria-label="Trackers on this entity">
                {contextTrackers.map((tag) => (
                  <li key={tag}>
                    <span className={TAG_MANAGE_ROW_TRACKER_CLASS}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-xs font-bold text-amber-100" aria-hidden>
                        ⚑
                      </span>
                      <span className="min-w-0 flex-1 truncate font-semibold">{tag}</span>
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
                <ul className={TAG_MANAGE_LIST_CLASS} aria-label="Other journal Trackers">
                  {otherTrackers.map((tag) => (
                    <li key={tag}>
                      <span className={TAG_MANAGE_ROW_TRACKER_CLASS}>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-xs font-bold text-amber-100" aria-hidden>
                          ⚑
                        </span>
                        <span className="min-w-0 flex-1 truncate font-semibold">{tag}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
        <p className="mt-3 text-[11px] tabular-nums text-zinc-500">
          {contextTrackers.length} on this entity
          {otherTrackers.length > 0
            ? ` · ${otherTrackers.length} other journal`
            : ""}
        </p>

        {manageOpen ? (
          <div className="mt-3 space-y-2 rounded-xl border border-amber-500/20 bg-zinc-950/70 p-3">
            <ul className={TAG_MANAGE_LIST_CLASS}>
              {manageInventory.map((tag) => {
                  const flagged = focusKeys.has(signalTagKey(tag));
                  const busy = pending && pendingTag === tag;
                  return (
                    <li key={tag}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggleTracker(tag)}
                        className={`${flagged ? TAG_MANAGE_ROW_TRACKER_CLASS : TAG_MANAGE_ROW_CLASS} disabled:opacity-40`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                            flagged ? "bg-amber-500/20 text-amber-100" : "bg-violet-600/20 text-violet-200"
                          }`}
                          aria-hidden
                        >
                          {flagged ? "⚑" : "#"}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-semibold text-zinc-100">{tag}</span>
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
              All Trackers →
            </Link>
          </div>
        ) : null}
      </section>

      {/* 4 — Universe */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-950/35 via-zinc-950/80 to-zinc-950/60 px-3 py-3 sm:px-4">
        <p className="text-xs font-medium text-zinc-300">Tag universe</p>
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
