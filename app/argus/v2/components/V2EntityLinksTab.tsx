"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { V2EntityCreateButton, V2EntityLinkButton } from "./V2CreateEntityButton";
import { V2EntityNeighborhoodPanel } from "./V2EntityNeighborhoodPanel";
import { V2IntelHelpLink } from "./V2IntelHelpLink";
import { V2Card } from "./v2-ui";
import { V2TagPatternBadges } from "./V2TagPatternBadges";
import type { LinkPanelFilter } from "@/lib/argus/create-flow-types";
import type { V2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import type { TagPattern } from "@/lib/argus/v2/tag-patterns";
import { LINK_HIERARCHY } from "@/lib/argus/ux-copy";
import { TAG_MANAGE_LIST_CLASS, TAG_MANAGE_ROW_CLASS } from "./tag-manage-list";

export type V2LinksMetric = {
  icon: string;
  label: string;
  count: number;
};

export type V2LinksEntity = {
  id: string;
  name: string;
  href: string;
  icon?: string;
  meta?: string;
};

export type V2LinksSection = {
  title: string;
  linkLabel: string;
  initialFilter: LinkPanelFilter;
  subtitle: string;
  browseHref?: string;
  entities: V2LinksEntity[];
  tone?: "event" | "topic" | "default";
  /**
   * Click selects in-panel (inspect properties); Open → / double-click navigates.
   * Mirrors Events browse select-then-open.
   */
  selectToInspect?: boolean;
};

export type V2LinksEvidenceCount = {
  label: string;
  value: number | string;
};

const SECTION_LINK_BTN =
  "rounded-md border border-violet-500/35 bg-violet-600/10 px-2 py-1 text-[11px] font-semibold text-violet-300 hover:bg-violet-600/20";
const EMPTY_LINK_BTN =
  "mt-2 inline-flex rounded-lg border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-600/25";

const CHIP_CLASS: Record<NonNullable<V2LinksSection["tone"]>, string> = {
  event:
    "flex w-full items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-950/30 px-2.5 py-1.5 text-[12px] text-rose-100 hover:border-rose-400/50",
  topic:
    "flex w-full items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-950/20 px-2.5 py-1.5 text-[12px] text-amber-100 hover:border-amber-400/40",
  default:
    "flex w-full items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-[12px] text-zinc-300 hover:border-violet-500/40 hover:text-violet-200",
};

/** Event-style metric pill — shared across Links tabs. */
export function V2LinksMetricPill({ icon, label, count }: V2LinksMetric) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-zinc-900/50 px-2 py-2 ring-1 ring-zinc-800/70">
      <span className="text-[11px] leading-none" aria-hidden>
        {icon}
      </span>
      <span className="mt-1 text-[11px] font-semibold tabular-nums leading-none text-violet-300/90">
        {count}
      </span>
      <span className="mt-1 text-[8px] uppercase tracking-wide text-zinc-600">{label}</span>
    </div>
  );
}

/**
 * Shared Links tab — Event metric pills + per-kind Link CTAs + local graph.
 * Used by Event, Topic, Organization, and Project.
 */
export function V2EntityLinksTab({
  entityId,
  linkedIds,
  helpTopic,
  helpLabel = "Links",
  intro = LINK_HIERARCHY.inboxLinkHint,
  metrics,
  sections,
  evidenceCounts,
  neighborhood,
  entityName,
  tagPatterns,
  manualTags,
  tagHref,
  signalTags,
  showCreate = true,
  /** Heading for binder/evidence tags block (avoid repeating tab name “Links”). */
  tagsHeading = "Linked tags",
  selectedEntityId,
  onSelectEntity,
  inspectSlot,
}: {
  entityId: string;
  linkedIds: string[];
  helpTopic?: string;
  helpLabel?: string;
  intro?: string;
  metrics?: V2LinksMetric[];
  sections: V2LinksSection[];
  evidenceCounts?: V2LinksEvidenceCount[];
  neighborhood?: V2EntityNeighborhoodGraph | null;
  entityName?: string;
  tagPatterns?: TagPattern[];
  manualTags?: string[];
  tagHref?: (tag: string) => string;
  signalTags?: string[];
  showCreate?: boolean;
  tagsHeading?: string;
  /** Selected linked entity (select-to-inspect sections). */
  selectedEntityId?: string | null;
  onSelectEntity?: (entity: V2LinksEntity | null) => void;
  /** Property panel under select-to-inspect sections (e.g. Event inspect on Topic). */
  inspectSlot?: ReactNode;
}) {
  const [showGraph, setShowGraph] = useState(false);
  const showTags =
    (tagPatterns && tagPatterns.length > 0) ||
    (manualTags && manualTags.length > 0) ||
    Boolean(tagPatterns || manualTags);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {helpTopic ? <V2IntelHelpLink topic={helpTopic} label={helpLabel} /> : null}
        <V2EntityLinkButton
          entityId={entityId}
          linkedIds={linkedIds}
          subtitle={intro}
          className="rounded-lg border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-600/25"
          buttonTitle={intro}
        />
        {showCreate ? (
          <V2EntityCreateButton className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800" />
        ) : null}
      </div>

      {metrics && metrics.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Linked entities
          </h3>
          <div
            className="inline-grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${Math.min(metrics.length, 6)}, minmax(0, 3.5rem))` }}
          >
            {metrics.map((metric) => (
              <V2LinksMetricPill key={metric.label} {...metric} />
            ))}
          </div>
        </div>
      ) : null}

      {sections.map((section) => (
        <div key={section.title} className="space-y-3">
          <LinksSectionBlock
            entityId={entityId}
            linkedIds={linkedIds}
            section={section}
            selectedEntityId={section.selectToInspect ? selectedEntityId : undefined}
            onSelectEntity={section.selectToInspect ? onSelectEntity : undefined}
          />
          {section.selectToInspect && inspectSlot ? inspectSlot : null}
        </div>
      ))}

      {evidenceCounts && evidenceCounts.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Evidence counts
          </h3>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {evidenceCounts.map((row) => (
              <div
                key={row.label}
                className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-3 py-2"
              >
                <dt className="text-xs text-zinc-600">{row.label}</dt>
                <dd className="font-semibold tabular-nums text-zinc-200">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {neighborhood ? (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-zinc-300">Local graph</p>
            <button
              type="button"
              onClick={() => setShowGraph((v) => !v)}
              className="rounded-lg border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-400 hover:text-zinc-200"
              aria-expanded={showGraph}
            >
              {showGraph ? "Collapse" : "Expand"}
            </button>
          </div>
          {showGraph ? (
            <V2EntityNeighborhoodPanel
              graph={neighborhood}
              entityId={entityId}
              entityName={entityName ?? "Entity"}
            />
          ) : (
            <p className="text-[11px] text-zinc-600">
              Graph stays collapsed so it does not cover linked entities — expand when you need it.
            </p>
          )}
        </div>
      ) : null}

      {showTags ? (
        <V2Card className="p-4">
          <h3 className="mb-4 text-sm font-semibold text-zinc-100">{tagsHeading}</h3>
          {manualTags && manualTags.length > 0 ? (
            <ul className={`mb-4 ${TAG_MANAGE_LIST_CLASS}`} aria-label={tagsHeading}>
              {manualTags.map((tag) => (
                <li key={tag}>
                  {tagHref ? (
                    <Link href={tagHref(tag)} className={TAG_MANAGE_ROW_CLASS}>
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-bold text-violet-200"
                        aria-hidden
                      >
                        #
                      </span>
                      <span className="min-w-0 flex-1 truncate font-semibold text-zinc-100">#{tag}</span>
                      <span className="shrink-0 text-zinc-500" aria-hidden>
                        →
                      </span>
                    </Link>
                  ) : (
                    <span className={TAG_MANAGE_ROW_CLASS}>
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-bold text-violet-200"
                        aria-hidden
                      >
                        #
                      </span>
                      <span className="min-w-0 flex-1 truncate font-semibold text-zinc-100">#{tag}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
          {tagPatterns && tagPatterns.length > 0 ? (
            <V2TagPatternBadges
              patterns={tagPatterns}
              signalTags={signalTags}
              className={manualTags && manualTags.length > 0 ? "mb-0" : "mb-0"}
              tagHref={tagHref}
              orientation="stack"
            />
          ) : null}
          {(!manualTags || manualTags.length === 0) && (!tagPatterns || tagPatterns.length === 0) ? (
            <p className="text-sm text-zinc-600">No tags linked yet.</p>
          ) : null}
        </V2Card>
      ) : null}
    </div>
  );
}

function LinksSectionBlock({
  entityId,
  linkedIds,
  section,
  selectedEntityId,
  onSelectEntity,
}: {
  entityId: string;
  linkedIds: string[];
  section: V2LinksSection;
  selectedEntityId?: string | null;
  onSelectEntity?: (entity: V2LinksEntity | null) => void;
}) {
  const tone = section.tone ?? "default";
  const count = section.entities.length;
  const selectMode = Boolean(section.selectToInspect && onSelectEntity);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
          {section.title} ({count})
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {section.browseHref && count > 0 ? (
            <Link
              href={section.browseHref}
              className="text-[11px] font-medium text-violet-300 hover:text-violet-200"
            >
              Browse →
            </Link>
          ) : null}
          <V2EntityLinkButton
            entityId={entityId}
            linkedIds={linkedIds}
            label={section.linkLabel}
            initialFilter={section.initialFilter}
            subtitle={section.subtitle}
            className={SECTION_LINK_BTN}
            buttonTitle={section.subtitle}
          />
        </div>
      </div>
      {selectMode && count > 0 ? (
        <p className="mb-2 text-[11px] text-zinc-500">
          Click to inspect · Open → or double-click to enter
        </p>
      ) : null}
      {count > 0 ? (
        <ul className="flex flex-col gap-1.5" aria-label={`${section.title} links`}>
          {section.entities.map((entity) => {
            if (selectMode) {
              const isSelected = selectedEntityId === entity.id;
              return (
                <li key={entity.id}>
                  <div
                    className={`${CHIP_CLASS[tone]} ${
                      isSelected
                        ? "ring-2 ring-violet-500/50 border-violet-400/50"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => onSelectEntity?.(isSelected ? null : entity)}
                      onDoubleClick={() => {
                        window.location.assign(entity.href);
                      }}
                      aria-pressed={isSelected}
                      title="Click to inspect properties"
                    >
                      {entity.icon ? (
                        <span className="shrink-0" aria-hidden>
                          {entity.icon}
                        </span>
                      ) : null}
                      <span className="min-w-0 flex-1 truncate font-medium">{entity.name}</span>
                      {entity.meta ? (
                        <span className="shrink-0 text-[10px] tabular-nums opacity-60">
                          {entity.meta}
                        </span>
                      ) : null}
                    </button>
                    <LinkedEntityOpenMenu href={entity.href} name={entity.name} />
                  </div>
                </li>
              );
            }
            return (
              <li key={entity.id}>
                <Link href={entity.href} className={CHIP_CLASS[tone]}>
                  {entity.icon ? (
                    <span className="shrink-0" aria-hidden>
                      {entity.icon}
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1 truncate font-medium">{entity.name}</span>
                  {entity.meta ? (
                    <span className="shrink-0 text-[10px] tabular-nums opacity-60">{entity.meta}</span>
                  ) : (
                    <span className="shrink-0 text-zinc-500" aria-hidden>
                      →
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div>
          <p className="text-sm text-zinc-500">None linked yet.</p>
          <V2EntityLinkButton
            entityId={entityId}
            linkedIds={linkedIds}
            label={section.linkLabel}
            initialFilter={section.initialFilter}
            subtitle={section.subtitle}
            className={EMPTY_LINK_BTN}
            buttonTitle={section.subtitle}
          />
        </div>
      )}
    </div>
  );
}

/** Corner ··· — Open linked entity (select-to-inspect rows). */
function LinkedEntityOpenMenu({ href, name }: { href: string; name: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        className="rounded-md px-1.5 py-0.5 text-xs font-bold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        aria-label={`More actions for ${name}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        ···
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 min-w-[9rem] rounded-lg border border-zinc-700 bg-zinc-950 py-1 shadow-xl"
          >
                    <Link
              href={href}
              role="menuitem"
              className="block px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-900"
              onClick={() => setOpen(false)}
            >
              Open →
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** @deprecated kept for any stray imports — prefer V2EntityLinksTab sections. */
export function LinksColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <V2Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-100">{title}</h3>
      {children}
    </V2Card>
  );
}
