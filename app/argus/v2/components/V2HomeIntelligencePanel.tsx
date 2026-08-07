"use client";

import { useMemo } from "react";
import type { V2FocusTagStat } from "@/lib/argus/v2/loaders";
import type { V2TagCloudItem } from "./V2TagCloud";
import { V2TagCloud } from "./V2TagCloud";
import { V2KnowledgeTreemap } from "./V2KnowledgeTreemap";
import { V2PortfolioBubbleMatrix } from "./V2PortfolioBubbleMatrix";
import { V2FocusTagPortfolio } from "./V2FocusTagPortfolio";
import { V2SignalTagsEditor } from "./V2SignalTagsEditor";
import {
  layoutTreemap,
  type V2KnowledgeNode,
} from "@/lib/argus/v2/intelligence-viz";

export type IntelligenceTab = "treemap" | "portfolio" | "tags";

export function V2HomeIntelligencePanel({
  nodes,
  tags,
  focusTagPortfolio = [],
  signalTags = [],
  tab,
  onLensChange,
}: {
  nodes: V2KnowledgeNode[];
  tags: V2TagCloudItem[];
  focusTagPortfolio?: V2FocusTagStat[];
  signalTags?: string[];
  tab: IntelligenceTab;
  onLensChange: (id: string | null) => void;
}) {
  const treemapNodes = useMemo(
    () => nodes.filter((n) => n.kind === "organization" || n.kind === "project" || n.kind === "topic"),
    [nodes]
  );
  const treemapRects = useMemo(() => layoutTreemap(treemapNodes, 100, 72), [treemapNodes]);

  /** Cloud sorted by the same triage score as the Tag universe list. */
  const scoredCloud = useMemo(() => {
    const byName = new Map(
      focusTagPortfolio.map((row) => [row.name.trim().toLowerCase(), row] as const)
    );
    return [...tags]
      .map((tag) => {
        const row = byName.get(tag.name.trim().toLowerCase());
        const score = row ? row.recencyScore * 0.55 + row.recurrenceScore * 0.45 : 0;
        return { tag, score, count: row?.count ?? tag.count };
      })
      .sort((a, b) => b.score - a.score || b.count - a.count || a.tag.name.localeCompare(b.tag.name))
      .map((row) => row.tag);
  }, [tags, focusTagPortfolio]);

  return (
    <div>
      {tab === "treemap" ? (
        <V2KnowledgeTreemap rects={treemapRects} size="full" onSelect={onLensChange} />
      ) : null}
      {tab === "portfolio" ? (
        <div className="space-y-2">
          <p className="text-[11px] text-zinc-600">
            Entity triage scatter (recency × recurrence). Prefer the neighborhood graph on org/project/topic detail
            for relationships — this view is for scanning volume and freshness.
          </p>
          <V2PortfolioBubbleMatrix nodes={nodes} size="full" onSelect={onLensChange} />
        </div>
      ) : null}
      {tab === "tags" ? (
        <div className="flex min-h-[min(480px,58vh)] flex-col gap-5 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-5">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Tag universe</h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Manage Focus Tags here — filter by Hot / Stale / Patterns, search, Flag or Remove. Axes match Portfolio
              (90d recency · 30d recurrence). Emulates a Notion filterable list + Obsidian tag pages; Focus trigger
              still lights the entity neighborhood graph.
            </p>
          </div>
          <V2SignalTagsEditor initialTags={signalTags} returnTo="/argus/v2#intelligence" compact />
          <V2FocusTagPortfolio
            rows={focusTagPortfolio}
            initialFocusTags={signalTags}
            variant="universe"
          />
          <div className="border-t border-zinc-800/80 pt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              Evidence cloud (ranked by recency × recurrence)
            </p>
            <V2TagCloud tags={scoredCloud} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
