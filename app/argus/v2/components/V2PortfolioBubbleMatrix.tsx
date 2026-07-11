"use client";

import type { V2KnowledgeNode } from "@/lib/argus/v2/intelligence-viz";

const KIND_COLORS: Record<V2KnowledgeNode["kind"], string> = {
  topic: "rgb(139, 92, 246)",
  project: "rgb(245, 158, 11)",
  organization: "rgb(56, 189, 248)",
};

const GRID_LINES = [0.25, 0.5, 0.75];

export function V2PortfolioBubbleMatrix({
  nodes,
  size = "compact",
  onSelect,
}: {
  nodes: V2KnowledgeNode[];
  size?: "compact" | "full";
  onSelect?: (id: string) => void;
}) {
  const portfolio = nodes.filter(
    (n) => n.kind === "topic" || n.kind === "project" || n.kind === "organization"
  );
  const heightClass = size === "full" ? "min-h-[min(560px,65vh)] h-[min(560px,65vh)]" : "h-56";

  if (portfolio.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-dashed border-zinc-800 text-sm text-zinc-500 ${heightClass}`}
      >
        Add topics and projects with linked evidence to see the portfolio matrix.
      </div>
    );
  }

  const maxEvidence = Math.max(...portfolio.map((n) => n.evidenceCount), 1);
  const plotLeft = 8;
  const plotRight = 92;
  const plotTop = 8;
  const plotBottom = 92;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  function handleActivate(node: V2KnowledgeNode, metaKey: boolean) {
    if (metaKey) {
      window.open(node.href, "_blank", "noopener,noreferrer");
      return;
    }
    onSelect?.(node.id);
  }

  return (
    <div>
      <svg
        viewBox="0 0 100 100"
        className={`w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 ${heightClass}`}
        role="img"
        aria-label="Portfolio matrix — vertical axis recency, horizontal axis recurrence in last 30 days"
      >
        <rect
          x={plotLeft}
          y={plotTop}
          width={plotWidth}
          height={plotHeight}
          fill="rgba(24, 24, 27, 0.35)"
          stroke="rgba(39, 39, 42, 0.8)"
          strokeWidth={0.3}
          rx={1}
        />

        {GRID_LINES.map((pct) => (
          <g key={`grid-${pct}`}>
            <line
              x1={plotLeft}
              y1={plotBottom - pct * plotHeight}
              x2={plotRight}
              y2={plotBottom - pct * plotHeight}
              stroke="rgba(63, 63, 70, 0.35)"
              strokeWidth={0.2}
            />
            <line
              x1={plotLeft + pct * plotWidth}
              y1={plotTop}
              x2={plotLeft + pct * plotWidth}
              y2={plotBottom}
              stroke="rgba(63, 63, 70, 0.35)"
              strokeWidth={0.2}
            />
          </g>
        ))}

        <text x={50} y={98} textAnchor="middle" fill="rgb(113, 113, 122)" fontSize={2.4}>
          Recurrence (30d) →
        </text>
        <text
          x={1.5}
          y={50}
          textAnchor="middle"
          fill="rgb(113, 113, 122)"
          fontSize={2.4}
          transform="rotate(-90 1.5 50)"
        >
          Recency →
        </text>

        {portfolio.map((node) => {
          const cx = plotLeft + node.recurrenceScore * plotWidth;
          const cy = plotBottom - node.recencyScore * plotHeight;
          const r = 2 + Math.sqrt(node.evidenceCount / maxEvidence) * 5;
          return (
            <g
              key={node.id}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`${node.name}, ${node.evidenceCount} evidence`}
              onClick={(event) => handleActivate(node, event.metaKey)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleActivate(node, event.metaKey);
                }
              }}
            >
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={KIND_COLORS[node.kind]}
                fillOpacity={0.55}
                stroke={KIND_COLORS[node.kind]}
                strokeWidth={0.4}
                className="transition hover:fill-opacity-90"
              />
              <title>
                {node.name} — {node.recurrence30d} evidence in 30d, recency{" "}
                {Math.round(node.recencyScore * 100)}%, {node.evidenceCount} total evidence
              </title>
              {r >= 3.5 ? (
                <text
                  x={cx}
                  y={cy + 0.6}
                  textAnchor="middle"
                  fill="rgb(244, 244, 245)"
                  fontSize={2}
                  fontWeight={600}
                  pointerEvents="none"
                >
                  {node.name.length > 10 ? `${node.name.slice(0, 8)}…` : node.name}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-zinc-500">
        <span>Click = lens below · ⌘/Ctrl+click = open focused view</span>
        <span>Y = recency</span>
        <span>X = recurrence (30d)</span>
        <span>Size = evidence</span>
      </div>
    </div>
  );
}
