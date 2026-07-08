"use client";

import type { V2KnowledgeNode } from "@/lib/argus/v2/intelligence-viz";

const KIND_COLORS: Record<V2KnowledgeNode["kind"], string> = {
  topic: "rgb(139, 92, 246)",
  project: "rgb(245, 158, 11)",
  organization: "rgb(56, 189, 248)",
  tag: "rgb(52, 211, 153)",
};

const QUADRANTS = [
  { x: 5, y: 5, w: 42, h: 42, label: "Invest", tone: "text-violet-300" },
  { x: 53, y: 5, w: 42, h: 42, label: "Maintain", tone: "text-emerald-300" },
  { x: 5, y: 53, w: 42, h: 42, label: "Explore", tone: "text-amber-300" },
  { x: 53, y: 53, w: 42, h: 42, label: "Archive", tone: "text-zinc-500" },
];

export function V2PortfolioBubbleMatrix({
  nodes,
  size = "compact",
}: {
  nodes: V2KnowledgeNode[];
  size?: "compact" | "full";
}) {
  const portfolio = nodes.filter((n) => n.kind === "topic" || n.kind === "project" || n.kind === "organization");
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

  return (
    <div>
      <svg
        viewBox="0 0 100 100"
        className={`w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 ${heightClass}`}
        role="img"
        aria-label="Portfolio matrix — vertical axis strategic value, horizontal axis completion"
      >
        {QUADRANTS.map((q) => (
          <g key={q.label}>
            <rect
              x={q.x}
              y={q.y}
              width={q.w}
              height={q.h}
              fill="rgba(24, 24, 27, 0.5)"
              stroke="rgba(39, 39, 42, 0.8)"
              strokeWidth={0.3}
              rx={1}
            />
            <text x={q.x + 2} y={q.y + 4} fill="rgb(113, 113, 122)" fontSize={2.2} className={q.tone}>
              {q.label}
            </text>
          </g>
        ))}

        <text x={50} y={98} textAnchor="middle" fill="rgb(113, 113, 122)" fontSize={2.4}>
          Completion →
        </text>
        <text
          x={1.5}
          y={50}
          textAnchor="middle"
          fill="rgb(113, 113, 122)"
          fontSize={2.4}
          transform="rotate(-90 1.5 50)"
        >
          Strategic value →
        </text>

        {portfolio.map((node) => {
          const cx = 8 + node.completion * 84;
          const cy = 92 - ((node.strategicValue - 1) / 4) * 84;
          const r = 2 + Math.sqrt(node.evidenceCount / maxEvidence) * 5;
          return (
            <g key={node.id}>
              <a href={node.href}>
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
                  {node.name} — value {node.strategicValue}/5, {Math.round(node.completion * 100)}% complete,{" "}
                  {node.evidenceCount} evidence
                </title>
              </a>
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
        <span>Y = strategic value</span>
        <span>X = completion</span>
        <span>Size = evidence</span>
      </div>
    </div>
  );
}
