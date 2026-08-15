"use client";

import { useEffect, useState, useTransition } from "react";
import { getEntityNeighborhoodAction } from "@/app/argus/actions";
import type {
  NeighborhoodHopDepth,
  V2EntityNeighborhoodGraph,
} from "@/lib/argus/v2/intelligence-viz";
import { V2IntelHelpLink } from "./V2IntelHelpLink";
import { V2KnowledgeGraph } from "./V2KnowledgeGraph";

const DEPTH_OPTIONS: Array<{
  depth: NeighborhoodHopDepth;
  label: string;
  title: string;
}> = [
  { depth: 2, label: "2", title: "Local · coherent default" },
  { depth: 3, label: "3", title: "Wide · Topics→Events ring" },
  { depth: 5, label: "5", title: "Extended · farther structural neighbors" },
];

/**
 * Connection neighborhood with hop-depth controls (2 / 3 / 5).
 * Trim always restores structural bridges so visible nodes stay connected.
 */
export function V2EntityNeighborhoodPanel({
  graph: initialGraph,
  entityId,
  entityName,
  variant = "full",
  title = "Connection neighborhood",
  scope = "local",
}: {
  graph: V2EntityNeighborhoodGraph;
  /** When set, depth toggles refetch via server action. */
  entityId?: string;
  entityName: string;
  /** Dock = compact Home Intelligence aside; full = Tags-model main / entity detail. */
  variant?: "full" | "dock";
  title?: string;
  scope?: "local" | "context";
}) {
  const docked = variant === "dock";
  const canFetch = Boolean(entityId);
  const [depth, setDepth] = useState<NeighborhoodHopDepth>(
    (initialGraph.meta?.maxHops as NeighborhoodHopDepth) || 2
  );
  const [graph, setGraph] = useState(initialGraph);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setGraph(initialGraph);
    setDepth((initialGraph.meta?.maxHops as NeighborhoodHopDepth) || 2);
  }, [initialGraph, entityId]);

  function selectDepth(next: NeighborhoodHopDepth) {
    if (!entityId) {
      setDepth(next);
      return;
    }
    setDepth(next);
    startTransition(async () => {
      const result = await getEntityNeighborhoodAction(entityId, { scope, maxHops: next });
      if ("error" in result) return;
      setGraph(result.graph);
    });
  }

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

  const meta = graph.meta;
  const showTrimNote = Boolean(meta?.trimmed);

  return (
    <div>
      <div className={`mb-2 flex flex-wrap items-center justify-between gap-2 ${docked ? "" : "mb-3"}`}>
        <h2 className={`min-w-0 truncate font-semibold text-zinc-100 ${docked ? "text-sm" : "text-base"}`}>
          {title}
          <span className="ml-1.5 font-normal text-zinc-500">· {entityName}</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-950/70 p-0.5"
            role="group"
            aria-label="Neighborhood hop depth"
          >
            {DEPTH_OPTIONS.map((option) => (
              <button
                key={option.depth}
                type="button"
                disabled={!canFetch && option.depth !== 2}
                aria-pressed={depth === option.depth}
                title={
                  !canFetch && option.depth !== 2
                    ? "Depth experiment needs live entity fetch"
                    : option.title
                }
                onClick={() => selectDepth(option.depth)}
                className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                  depth === option.depth
                    ? "bg-violet-600/25 text-violet-200"
                    : "text-zinc-500 hover:text-zinc-300 disabled:opacity-40"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <V2IntelHelpLink topic="neighborhood" label="Graph help" />
        </div>
      </div>

      {showTrimNote ? (
        <p
          className={`mb-2 rounded-lg border border-zinc-800 bg-zinc-950/50 px-2.5 py-1.5 text-zinc-400 ${
            docked ? "text-[10px]" : "text-[11px]"
          }`}
        >
          Showing {meta?.keptCount}/{meta?.candidateCount} neighbors at depth {meta?.maxHops ?? depth}.
          Structural bridges to visible nodes are kept so connections stay drawn.
        </p>
      ) : null}

      {pending ? (
        <p className="mb-2 text-[10px] text-zinc-600">Updating depth…</p>
      ) : null}

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
