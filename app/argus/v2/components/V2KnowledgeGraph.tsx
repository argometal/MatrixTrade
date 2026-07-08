"use client";

import type { V2GraphEdge, V2GraphNode } from "@/lib/argus/v2/intelligence-viz";

const NODE_COLORS: Record<V2GraphNode["kind"], string> = {
  organization: "rgb(56, 189, 248)",
  project: "rgb(245, 158, 11)",
  person: "rgb(139, 92, 246)",
  topic: "rgb(52, 211, 153)",
  event: "rgb(251, 113, 133)",
};

const KIND_LABELS: Record<V2GraphNode["kind"], string> = {
  organization: "Org",
  project: "Project",
  person: "Person",
  topic: "Topic",
  event: "Event",
};

export function V2KnowledgeGraph({
  nodes,
  edges,
  size = "compact",
}: {
  nodes: V2GraphNode[];
  edges: V2GraphEdge[];
  size?: "compact" | "full";
}) {
  const heightClass = size === "full" ? "min-h-[min(480px,55vh)] h-[min(480px,55vh)]" : "h-56";

  if (nodes.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-dashed border-zinc-800 text-sm text-zinc-500 ${heightClass}`}
      >
        Link people, projects, and topics to see the relationship graph.
      </div>
    );
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div>
      <svg
        viewBox="0 0 100 100"
        className={`w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 ${heightClass}`}
        role="img"
        aria-label="Relationship graph of linked entities"
      >
        {edges.map((edge) => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="rgba(113, 113, 122, 0.45)"
              strokeWidth={Math.min(1.2, 0.4 + edge.weight * 0.2)}
            />
          );
        })}

        {nodes.map((node) => (
          <g key={node.id}>
            <a href={node.href}>
              <circle
                cx={node.x}
                cy={node.y}
                r={3.2 + Math.min(2, node.evidenceCount / 4)}
                fill={NODE_COLORS[node.kind]}
                fillOpacity={0.7}
                stroke="rgb(9, 9, 11)"
                strokeWidth={0.5}
                className="transition hover:fill-opacity-100"
              />
              <title>
                {node.name} ({KIND_LABELS[node.kind]}) — {node.evidenceCount} evidence
              </title>
            </a>
            <text
              x={node.x}
              y={node.y + 6.5}
              textAnchor="middle"
              fill="rgb(161, 161, 170)"
              fontSize={2}
              pointerEvents="none"
            >
              {node.name.length > 12 ? `${node.name.slice(0, 10)}…` : node.name}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-zinc-500">
        {(["organization", "project", "person", "topic", "event"] as const).map((kind) => (
          <span key={kind} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: NODE_COLORS[kind] }} />
            {KIND_LABELS[kind]}
          </span>
        ))}
      </div>
    </div>
  );
}
