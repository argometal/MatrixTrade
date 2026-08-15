"use client";

import type { TagPattern } from "@/lib/argus/v2/tag-patterns";
import type { EvidenceMixSegment } from "@/lib/argus/v2/evidence-mix";
import { V2EvidenceMixDonut } from "./V2EvidenceMixDonut";
import { V2TagPatternBadges } from "./V2TagPatternBadges";
import { V2RelationshipChart } from "./V2RelationshipChart";

/**
 * Experimental Overview main column — one job: “what is this binder made of, and is it alive?”
 * Replaces the empty space under Org/Project chips without adding a second dashboard.
 */
export function V2OverviewBinderPulse({
  title = "Evidence mix",
  subtitle,
  evidenceMix,
  structuralMix,
  tagPatterns,
  sparkline,
  chartStartYear,
  chartEndYear,
  onOpenTimeline,
  onOpenTags,
}: {
  title?: string;
  subtitle?: string;
  evidenceMix: EvidenceMixSegment[];
  /** Optional second ring: people / topics / events in the graph. */
  structuralMix?: EvidenceMixSegment[];
  tagPatterns?: TagPattern[];
  sparkline?: number[];
  chartStartYear?: number;
  chartEndYear?: number;
  onOpenTimeline?: () => void;
  onOpenTags?: () => void;
}) {
  const hasSpark = Boolean(sparkline && sparkline.length > 0 && chartStartYear != null && chartEndYear != null);
  const hasTags = Boolean(tagPatterns && tagPatterns.length > 0);

  return (
    <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-4 sm:px-5" aria-label={title}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400/90">Overview pulse</p>
          <h3 className="mt-0.5 text-sm font-semibold text-zinc-100">{title}</h3>
          {subtitle ? <p className="mt-1 max-w-md text-xs leading-relaxed text-zinc-500">{subtitle}</p> : null}
        </div>
        {onOpenTimeline ? (
          <button
            type="button"
            onClick={onOpenTimeline}
            className="rounded-lg border border-zinc-700 px-2.5 py-1 text-[11px] font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
          >
            Open Timeline →
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">Evidence</p>
          <V2EvidenceMixDonut segments={evidenceMix} emptyLabel="No notes or emails in scope" />
        </div>
        {structuralMix && structuralMix.length > 0 ? (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">Graph binders</p>
            <V2EvidenceMixDonut segments={structuralMix} emptyLabel="No linked binders" size="sm" />
          </div>
        ) : hasSpark ? (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">Activity</p>
            <V2RelationshipChart
              points={sparkline!}
              startYear={chartStartYear!}
              endYear={chartEndYear!}
            />
          </div>
        ) : null}
      </div>

      {hasTags ? (
        <div className="mt-5 border-t border-zinc-800/80 pt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              Recurring tags on evidence
            </p>
            {onOpenTags ? (
              <button
                type="button"
                onClick={onOpenTags}
                className="text-[11px] text-violet-400 hover:text-violet-300"
              >
                Tags →
              </button>
            ) : null}
          </div>
          <V2TagPatternBadges patterns={tagPatterns!.slice(0, 8)} />
        </div>
      ) : null}
    </section>
  );
}
