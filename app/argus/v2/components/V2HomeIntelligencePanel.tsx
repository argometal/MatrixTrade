"use client";

import { useEffect, useMemo, useState } from "react";
import type { V2FocusTagStat, V2TagEvidenceContext } from "@/lib/argus/v2/loaders";
import {
  filterIntelligenceNodes,
  type IntelligenceUniverseFilter,
} from "@/lib/argus/v2/intelligence-filters";
import { V2KnowledgeTreemap } from "./V2KnowledgeTreemap";
import { V2PortfolioBubbleMatrix } from "./V2PortfolioBubbleMatrix";
import { V2FocusTagPortfolio } from "./V2FocusTagPortfolio";
import { V2HomeNeighborhoodViewer } from "./V2HomeNeighborhoodViewer";
import { V2IntelligenceUniverseFilters } from "./V2IntelligenceUniverseFilters";
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
  const [universeFilter, setUniverseFilter] = useState<IntelligenceUniverseFilter>("all");

  useEffect(() => {
    setUniverseFilter("all");
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
      {tab === "treemap" || tab === "portfolio" ? (
        <div className="mb-3">
          <V2IntelligenceUniverseFilters
            filter={universeFilter}
            onChange={(next) => {
              setUniverseFilter(next);
              onLensChange(null);
            }}
            ariaLabel={tab === "treemap" ? "Filter Treemap universe" : "Filter Portfolio universe"}
          />
        </div>
      ) : null}

      {tab === "treemap" ? (
        <div className="space-y-2">
          <p className="text-[11px] text-zinc-600">
            Full portfolio — {treemapCounts.organizations} orgs · {treemapCounts.projects} projects ·{" "}
            {treemapCounts.topics} topics ({treemapCounts.total} tiles
            {universeFilter !== "all" ? ` · ${INTELLIGENCE_FILTER_SHORT[universeFilter]}` : ""}). Size =
            evidence volume; select a tile for the main connection neighborhood. Small dock = one level up.
          </p>
          {treemapRects.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-800/80 px-3 py-8 text-center text-sm text-zinc-500">
              No entities match this filter. Switch to Universe or another filter.
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
            <p className="rounded-xl border border-dashed border-zinc-800/80 px-3 py-4 text-center text-xs text-zinc-600">
              Select a tile to open the main connection neighborhood here.
            </p>
          )}
        </div>
      ) : null}
      {tab === "portfolio" ? (
        <div className="space-y-2">
          <p className="text-[11px] text-zinc-600">
            Entity triage scatter (recency × recurrence)
            {universeFilter !== "all" ? ` · ${INTELLIGENCE_FILTER_SHORT[universeFilter]}` : ""}. Select a bubble for
            the main connection neighborhood; the small right dock shows one level up when available.
          </p>
          {filteredNodes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-800/80 px-3 py-8 text-center text-sm text-zinc-500">
              No entities match this filter. Switch to Universe or another filter.
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

const INTELLIGENCE_FILTER_SHORT: Record<Exclude<IntelligenceUniverseFilter, "all">, string> = {
  hot: "Hot",
  patterns: "Patterns",
  stale: "Stale",
  focus: "Trackers",
};
