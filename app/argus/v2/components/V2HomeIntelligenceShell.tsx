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
  type V2HomeEvidenceSummary,
  type V2KnowledgeNode,
} from "@/lib/argus/v2/intelligence-viz";

type IntelligenceTab = "treemap" | "portfolio" | "graph" | "tags";

const INTELLIGENCE_TABS: { id: IntelligenceTab; label: string }[] = [
  { id: "treemap", label: "Treemap" },
  { id: "portfolio", label: "Portfolio" },
  { id: "graph", label: "Graph" },
  { id: "tags", label: "Tags" },
];

export function V2HomeIntelligenceShell({
  nodes,
  graphNodes,
  graphEdges,
  tags,
  summary,
}: {
  nodes: V2KnowledgeNode[];
  graphNodes: V2GraphNode[];
  graphEdges: V2GraphEdge[];
  tags: V2TagCloudItem[];
  summary: V2HomeEvidenceSummary;
}) {
  const [tab, setTab] = useState<IntelligenceTab>("treemap");
  const treemapRects = useMemo(() => layoutTreemap(nodes, 100, 56), [nodes]);

  return (
    <div className="mb-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Knowledge Intelligence</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Where evidence lives, what deserves attention, and how entities connect.
          </p>
        </div>
        <V2TabBar tabs={INTELLIGENCE_TABS} active={tab} onChange={setTab} />
      </div>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
        <span>
          <span className="text-zinc-300">{summary.journal}</span> journal
          {summary.journalWeek > 0 ? (
            <span className="text-emerald-500/80"> +{summary.journalWeek} this week</span>
          ) : null}
        </span>
        <span>
          <span className="text-zinc-300">{summary.emails}</span> emails
          {summary.emailWeek > 0 ? (
            <span className="text-emerald-500/80"> +{summary.emailWeek} this week</span>
          ) : null}
        </span>
        <span>
          <span className="text-zinc-300">{summary.people}</span> people
        </span>
        <span>
          <span className="text-zinc-300">{summary.organizations}</span> orgs
        </span>
        <span>
          <span className="text-zinc-300">{summary.projects}</span> projects
        </span>
      </div>

      {tab === "treemap" ? <V2KnowledgeTreemap rects={treemapRects} /> : null}
      {tab === "portfolio" ? <V2PortfolioBubbleMatrix nodes={nodes} /> : null}
      {tab === "graph" ? <V2KnowledgeGraph nodes={graphNodes} edges={graphEdges} /> : null}
      {tab === "tags" ? (
        <div className="min-h-56 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-5">
          <p className="mb-3 text-xs text-zinc-500">Tag size reflects recurrence across journal and inbox evidence.</p>
          <V2TagCloud tags={tags} />
        </div>
      ) : null}
    </div>
  );
}
