"use client";

import type { V2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import { V2KnowledgeGraph } from "./V2KnowledgeGraph";

export function V2EntityNeighborhoodPanel({
  graph,
  entityName,
}: {
  graph: V2EntityNeighborhoodGraph;
  entityName: string;
}) {
  if (graph.nodes.length <= 1) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-4 py-8 text-center">
        <p className="text-sm text-zinc-500">No linked neighbors yet.</p>
        <p className="mt-1 text-xs text-zinc-600">
          Link people, projects, topics, or events to see how {entityName} connects in your evidence graph.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-zinc-100">Connection neighborhood</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Local view around {entityName} — links and co-mentioned evidence (1–2 hops). Hover to highlight; click to open.
        </p>
      </div>
      <V2KnowledgeGraph
        nodes={graph.nodes}
        edges={graph.edges}
        size="full"
        centerId={graph.centerId}
        layout="neighborhood"
      />
    </div>
  );
}
