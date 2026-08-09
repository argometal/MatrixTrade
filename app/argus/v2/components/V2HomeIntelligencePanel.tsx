"use client";

import { useMemo } from "react";
import type { V2FocusTagStat, V2TagEvidenceContext } from "@/lib/argus/v2/loaders";
import { V2KnowledgeTreemap } from "./V2KnowledgeTreemap";
import { V2PortfolioBubbleMatrix } from "./V2PortfolioBubbleMatrix";
import { V2FocusTagPortfolio } from "./V2FocusTagPortfolio";
import {
  layoutTreemap,
  type V2KnowledgeNode,
} from "@/lib/argus/v2/intelligence-viz";

export type IntelligenceTab = "treemap" | "portfolio" | "tags";

export function V2HomeIntelligencePanel({
  nodes,
  focusTagPortfolio = [],
  signalTags = [],
  tagEvidenceByTag = {},
  tab,
  onLensChange,
}: {
  nodes: V2KnowledgeNode[];
  /** @deprecated Tags cloud removed from Tags tab — kept optional for call-site compat. */
  tags?: unknown;
  focusTagPortfolio?: V2FocusTagStat[];
  signalTags?: string[];
  tagEvidenceByTag?: Record<string, V2TagEvidenceContext>;
  tab: IntelligenceTab;
  onLensChange: (id: string | null) => void;
}) {
  const treemapNodes = useMemo(
    () => nodes.filter((n) => n.kind === "organization" || n.kind === "project" || n.kind === "topic"),
    [nodes]
  );
  const treemapRects = useMemo(() => layoutTreemap(treemapNodes, 100, 72), [treemapNodes]);
  const treemapCounts = useMemo(() => {
    let organizations = 0;
    let projects = 0;
    let topics = 0;
    for (const node of treemapNodes) {
      if (node.kind === "organization") organizations += 1;
      else if (node.kind === "project") projects += 1;
      else topics += 1;
    }
    return { organizations, projects, topics, total: treemapNodes.length };
  }, [treemapNodes]);

  return (
    <div>
      {tab === "treemap" ? (
        <div className="space-y-2">
          <p className="text-[11px] text-zinc-600">
            Full portfolio — {treemapCounts.organizations} orgs · {treemapCounts.projects} projects ·{" "}
            {treemapCounts.topics} topics ({treemapCounts.total} tiles). Size = evidence volume; empty
            binders still appear as minimum tiles.
          </p>
          <V2KnowledgeTreemap rects={treemapRects} size="full" onSelect={onLensChange} />
        </div>
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
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Tag universe</h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Primary navigation for behavioral evidence. Click a tag to see the notes and email that created it —
              Focus is a watchlist filter, not the purpose of this page.
            </p>
          </div>
          <V2FocusTagPortfolio
            rows={focusTagPortfolio}
            initialFocusTags={signalTags}
            evidenceByTag={tagEvidenceByTag}
          />
        </div>
      ) : null}
    </div>
  );
}
