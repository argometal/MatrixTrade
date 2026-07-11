"use client";

import { useMemo } from "react";
import type { V2TagCloudItem } from "./V2TagCloud";
import { V2TagCloud } from "./V2TagCloud";
import { V2KnowledgeTreemap } from "./V2KnowledgeTreemap";
import { V2PortfolioBubbleMatrix } from "./V2PortfolioBubbleMatrix";
import {
  layoutTreemap,
  type V2KnowledgeNode,
} from "@/lib/argus/v2/intelligence-viz";

export type IntelligenceTab = "treemap" | "portfolio" | "tags";

export function V2HomeIntelligencePanel({
  nodes,
  tags,
  tab,
  onLensChange,
}: {
  nodes: V2KnowledgeNode[];
  tags: V2TagCloudItem[];
  tab: IntelligenceTab;
  onLensChange: (id: string | null) => void;
}) {
  const treemapNodes = useMemo(
    () => nodes.filter((n) => n.kind === "organization" || n.kind === "project" || n.kind === "topic"),
    [nodes]
  );
  const treemapRects = useMemo(() => layoutTreemap(treemapNodes, 100, 72), [treemapNodes]);

  return (
    <div>
      {tab === "treemap" ? (
        <V2KnowledgeTreemap rects={treemapRects} size="full" onSelect={onLensChange} />
      ) : null}
      {tab === "portfolio" ? (
        <V2PortfolioBubbleMatrix nodes={nodes} size="full" onSelect={onLensChange} />
      ) : null}
      {tab === "tags" ? (
        <div className="flex min-h-[min(480px,58vh)] flex-col rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-5">
          <V2TagCloud tags={tags} />
        </div>
      ) : null}
    </div>
  );
}
