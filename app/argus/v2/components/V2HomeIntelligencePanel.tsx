"use client";

import { useMemo, useState } from "react";
import type { V2TagCloudItem } from "./V2TagCloud";
import { V2TagCloud } from "./V2TagCloud";
import { V2TabBar } from "./V2TabBar";
import { V2KnowledgeTreemap } from "./V2KnowledgeTreemap";
import { V2PortfolioBubbleMatrix } from "./V2PortfolioBubbleMatrix";
import { V2KnowledgeGraph } from "./V2KnowledgeGraph";
import {
  layoutTreemap,
  type V2GraphEdge,
  type V2GraphNode,
  type V2KnowledgeNode,
} from "@/lib/argus/v2/intelligence-viz";

type IntelligenceTab = "treemap" | "portfolio" | "graph" | "tags";

const INTELLIGENCE_TABS: { id: IntelligenceTab; label: string }[] = [
  { id: "treemap", label: "Treemap" },
  { id: "portfolio", label: "Portfolio" },
  { id: "graph", label: "Graph" },
  { id: "tags", label: "Tags" },
];

/** Full-height intelligence workspace — Finviz/Bloomberg pattern: viz gets the canvas, not a home teaser. */
export function V2HomeIntelligencePanel({
  nodes,
  graphNodes,
  graphEdges,
  tags,
}: {
  nodes: V2KnowledgeNode[];
  graphNodes: V2GraphNode[];
  graphEdges: V2GraphEdge[];
  tags: V2TagCloudItem[];
}) {
  const [tab, setTab] = useState<IntelligenceTab>("treemap");
  const treemapRects = useMemo(() => layoutTreemap(nodes, 100, 72), [nodes]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-zinc-500">
          Where evidence lives, what deserves attention, and how entities connect.
        </p>
        <V2TabBar tabs={INTELLIGENCE_TABS} active={tab} onChange={setTab} />
      </div>

      {tab === "treemap" ? <V2KnowledgeTreemap rects={treemapRects} size="full" /> : null}
      {tab === "portfolio" ? <V2PortfolioBubbleMatrix nodes={nodes} size="full" /> : null}
      {tab === "graph" ? <V2KnowledgeGraph nodes={graphNodes} edges={graphEdges} size="full" /> : null}
      {tab === "tags" ? (
        <div className="flex min-h-[min(480px,55vh)] flex-col rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-6">
          <p className="mb-4 text-xs text-zinc-500">Tag size reflects recurrence across journal and inbox evidence.</p>
          <V2TagCloud tags={tags} />
        </div>
      ) : null}
    </div>
  );
}
