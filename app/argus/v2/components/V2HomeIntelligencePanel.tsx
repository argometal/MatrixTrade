"use client";

import { useMemo, useState } from "react";
import type { V2TagCloudItem } from "./V2TagCloud";
import { V2TagCloud } from "./V2TagCloud";
import { V2TabBar } from "./V2TabBar";
import { V2KnowledgeTreemap } from "./V2KnowledgeTreemap";
import { V2PortfolioBubbleMatrix } from "./V2PortfolioBubbleMatrix";
import {
  layoutTreemap,
  type V2KnowledgeNode,
} from "@/lib/argus/v2/intelligence-viz";

type IntelligenceTab = "treemap" | "portfolio" | "tags";

const INTELLIGENCE_TABS: { id: IntelligenceTab; label: string }[] = [
  { id: "treemap", label: "Treemap" },
  { id: "portfolio", label: "Portfolio" },
  { id: "tags", label: "Tags" },
];

/** Full-height intelligence workspace — Finviz/Bloomberg pattern: viz gets the canvas, not a home teaser. */
export function V2HomeIntelligencePanel({
  nodes,
  tags,
}: {
  nodes: V2KnowledgeNode[];
  tags: V2TagCloudItem[];
}) {
  const [tab, setTab] = useState<IntelligenceTab>("treemap");
  const treemapNodes = useMemo(
    () => nodes.filter((n) => n.kind === "organization" || n.kind === "project" || n.kind === "topic"),
    [nodes]
  );
  const treemapRects = useMemo(() => layoutTreemap(treemapNodes, 100, 72), [treemapNodes]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-zinc-500">
          Where evidence lives and what deserves attention. Connection graphs live on each organization, project, and topic.
        </p>
        <V2TabBar tabs={INTELLIGENCE_TABS} active={tab} onChange={setTab} />
      </div>

      {tab === "treemap" ? <V2KnowledgeTreemap rects={treemapRects} size="full" /> : null}
      {tab === "portfolio" ? <V2PortfolioBubbleMatrix nodes={nodes} size="full" /> : null}
      {tab === "tags" ? (
        <div className="flex min-h-[min(560px,65vh)] flex-col rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-6">
          <p className="mb-4 text-xs text-zinc-500">Tag size reflects recurrence across journal and inbox evidence.</p>
          <V2TagCloud tags={tags} />
        </div>
      ) : null}
    </div>
  );
}
