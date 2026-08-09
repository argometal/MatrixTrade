"use client";

import { useMemo } from "react";
import type { V2FocusTagStat, V2TagEvidenceContext } from "@/lib/argus/v2/loaders";
import { V2KnowledgeTreemap } from "./V2KnowledgeTreemap";
import { V2PortfolioBubbleMatrix } from "./V2PortfolioBubbleMatrix";
import { V2FocusTagPortfolio } from "./V2FocusTagPortfolio";
import { V2HomeNeighborhoodViewer } from "./V2HomeNeighborhoodViewer";
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
  lensId = null,
  onLensChange,
}: {
  nodes: V2KnowledgeNode[];
  /** @deprecated Tags cloud removed from Tags tab — kept optional for call-site compat. */
  tags?: unknown;
  focusTagPortfolio?: V2FocusTagStat[];
  signalTags?: string[];
  tagEvidenceByTag?: Record<string, V2TagEvidenceContext>;
  tab: IntelligenceTab;
  /** Selected Treemap/Portfolio entity — drives main Tags-model neighborhood below. */
  lensId?: string | null;
  onLensChange: (id: string | null) => void;
}) {
  const lensNode = lensId ? nodes.find((n) => n.id === lensId) : undefined;
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
            {treemapCounts.topics} topics ({treemapCounts.total} tiles). Size = evidence volume; select a tile for the
            main connection neighborhood (Tags model). Small dock on the right = one level up.
          </p>
          <V2KnowledgeTreemap rects={treemapRects} size="full" onSelect={onLensChange} />
          {lensNode ? (
            <V2HomeNeighborhoodViewer
              entityId={lensNode.id}
              entityName={lensNode.name}
              variant="inline"
              scope="local"
            />
          ) : (
            <p className="rounded-xl border border-dashed border-zinc-800/80 px-3 py-4 text-center text-xs text-zinc-600">
              Select a tile to open the main connection neighborhood here.
            </p>
          )}
        </div>
      ) : null}
      {tab === "portfolio" ? (
        <div className="space-y-2">
          <p className="text-[11px] text-zinc-600">
            Entity triage scatter (recency × recurrence). Select a bubble for the main connection neighborhood below;
            the small right dock shows one level up when available.
          </p>
          <V2PortfolioBubbleMatrix nodes={nodes} size="full" onSelect={onLensChange} />
          {lensNode ? (
            <V2HomeNeighborhoodViewer
              entityId={lensNode.id}
              entityName={lensNode.name}
              variant="inline"
              scope="local"
            />
          ) : (
            <p className="rounded-xl border border-dashed border-zinc-800/80 px-3 py-4 text-center text-xs text-zinc-600">
              Select a bubble to open the main connection neighborhood here.
            </p>
          )}
        </div>
      ) : null}
      {tab === "tags" ? (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Tags · universe</h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Manage the Tag universe (Universe / Hot / Patterns / Stale / Trackers). Flag or Disable Tracker without
              deleting Tags. Create Topic Tags on Topic → Tags; create Note Tags on Event → Note.
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
