"use client";

import { useEffect, useMemo } from "react";
import type { V2FocusTagStat, V2TagEvidenceContext } from "@/lib/argus/v2/loaders";
import {
  filterIntelligenceNodes,
  type IntelligenceUniverseFilter,
} from "@/lib/argus/v2/intelligence-filters";
import { V2KnowledgeTreemap } from "./V2KnowledgeTreemap";
import { V2PortfolioBubbleMatrix } from "./V2PortfolioBubbleMatrix";
import { V2FocusTagPortfolio } from "./V2FocusTagPortfolio";
import { V2HomeNeighborhoodViewer } from "./V2HomeNeighborhoodViewer";
import { V2IntelHelpLink } from "./V2IntelHelpLink";
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
  universeFilter = "all",
  onUniverseFilterChange,
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
  /** Controlled from Home one-line toolbar (Universe / Hot / …). */
  universeFilter?: IntelligenceUniverseFilter;
  onUniverseFilterChange?: (next: IntelligenceUniverseFilter) => void;
}) {
  useEffect(() => {
    onLensChange(null);
    // Reset selection when switching Intelligence tabs / filter surfaces.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when tab changes
  }, [tab]);

  const filteredNodes = useMemo(
    () => filterIntelligenceNodes(nodes, universeFilter),
    [nodes, universeFilter]
  );

  const treemapNodes = useMemo(
    () =>
      filteredNodes.filter(
        (n) => n.kind === "organization" || n.kind === "project" || n.kind === "topic"
      ),
    [filteredNodes]
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

  const lensNode = lensId ? nodes.find((n) => n.id === lensId) : undefined;
  // Clear lens if filtered out of current universe slice.
  const lensVisible = lensNode ? filteredNodes.some((n) => n.id === lensNode.id) : false;
  const activeLens = lensVisible ? lensNode : undefined;

  return (
    <div>
      {tab === "treemap" ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-zinc-600">
              {treemapCounts.organizations} orgs · {treemapCounts.projects} projects · {treemapCounts.topics}{" "}
              topics ({treemapCounts.total}
              {universeFilter !== "all" ? ` · ${INTELLIGENCE_FILTER_SHORT[universeFilter]}` : ""})
            </p>
            <V2IntelHelpLink topic="treemap" label="Help" />
          </div>
          {treemapRects.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-800/80 px-3 py-8 text-center text-sm text-zinc-500">
              No entities match this filter.
            </p>
          ) : (
            <V2KnowledgeTreemap rects={treemapRects} size="full" onSelect={onLensChange} />
          )}
          {activeLens ? (
            <V2HomeNeighborhoodViewer
              entityId={activeLens.id}
              entityName={activeLens.name}
              variant="inline"
              scope="local"
            />
          ) : (
            <p className="rounded-xl border border-dashed border-zinc-800/80 px-3 py-3 text-center text-xs text-zinc-600">
              Select a tile for its neighborhood
            </p>
          )}
        </div>
      ) : null}
      {tab === "portfolio" ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-zinc-600">
              {filteredNodes.length} entities
              {universeFilter !== "all" ? ` · ${INTELLIGENCE_FILTER_SHORT[universeFilter]}` : ""}
            </p>
            <V2IntelHelpLink topic="portfolio" label="Help" />
          </div>
          {filteredNodes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-800/80 px-3 py-8 text-center text-sm text-zinc-500">
              No entities match this filter.
            </p>
          ) : (
            <V2PortfolioBubbleMatrix nodes={filteredNodes} size="full" onSelect={onLensChange} />
          )}
          {activeLens ? (
            <V2HomeNeighborhoodViewer
              entityId={activeLens.id}
              entityName={activeLens.name}
              variant="inline"
              scope="local"
            />
          ) : (
            <p className="rounded-xl border border-dashed border-zinc-800/80 px-3 py-3 text-center text-xs text-zinc-600">
              Select a bubble for its neighborhood
            </p>
          )}
        </div>
      ) : null}
      {tab === "tags" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-100">Tags · universe</h3>
            <V2IntelHelpLink topic="tags-universe" label="Help" />
          </div>
          <V2FocusTagPortfolio
            rows={focusTagPortfolio}
            initialFocusTags={signalTags}
            evidenceByTag={tagEvidenceByTag}
            filter={universeFilter}
            onFilterChange={onUniverseFilterChange}
          />
        </div>
      ) : null}
    </div>
  );
}

const INTELLIGENCE_FILTER_SHORT: Record<Exclude<IntelligenceUniverseFilter, "all">, string> = {
  hot: "Hot",
  patterns: "Patterns",
  stale: "Stale",
  focus: "Trackers",
};
