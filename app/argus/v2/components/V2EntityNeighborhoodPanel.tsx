"use client";

import type { V2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import { V2IntelHelpLink } from "./V2IntelHelpLink";
import { V2KnowledgeGraph } from "./V2KnowledgeGraph";

export function V2EntityNeighborhoodPanel({
  graph,
  entityName,
  variant = "full",
  title = "Connection neighborhood",
}: {
  graph: V2EntityNeighborhoodGraph;
  entityName: string;
  /** Dock = compact Home Intelligence aside; full = Tags-model main / entity detail. */
  variant?: "full" | "dock";
  title?: string;
}) {
  const docked = variant === "dock";

  if (graph.nodes.length <= 1) {
    return (
      <div
        className={`rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 text-center ${
          docked ? "px-3 py-5" : "px-4 py-8"
        }`}
      >
        <p className={`text-zinc-500 ${docked ? "text-xs" : "text-sm"}`}>No linked neighbors yet.</p>
        <p className={`mt-1 text-zinc-600 ${docked ? "text-[10px]" : "text-xs"}`}>
          Link people, projects, topics, or events to see how {entityName} connects in your evidence graph.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className={`mb-2 flex items-center justify-between gap-2 ${docked ? "" : "mb-3"}`}>
        <h2 className={`min-w-0 truncate font-semibold text-zinc-100 ${docked ? "text-sm" : "text-base"}`}>
          {title}
          <span className="ml-1.5 font-normal text-zinc-500">· {entityName}</span>
        </h2>
        <V2IntelHelpLink topic="neighborhood" label="Graph help" />
      </div>
      <V2KnowledgeGraph
        nodes={graph.nodes}
        edges={graph.edges}
        size={docked ? "compact" : "full"}
        centerId={graph.centerId}
        layout="neighborhood"
      />
    </div>
  );
}
