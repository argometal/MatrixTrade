"use client";

import type { V2TreemapRect } from "@/lib/argus/v2/intelligence-viz";

function activityColor(recentActivity: number): string {
  if (recentActivity >= 0.5) return "rgba(16, 185, 129, 0.75)";
  if (recentActivity >= 0.2) return "rgba(52, 211, 153, 0.55)";
  if (recentActivity > 0) return "rgba(113, 113, 122, 0.65)";
  return "rgba(63, 63, 70, 0.75)";
}

export function V2KnowledgeTreemap({
  rects,
  size = "compact",
  onSelect,
}: {
  rects: V2TreemapRect[];
  size?: "compact" | "full";
  onSelect?: (id: string) => void;
}) {
  if (rects.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-dashed border-zinc-800 text-sm text-zinc-500 ${
          size === "full" ? "min-h-[min(560px,65vh)]" : "h-56"
        }`}
      >
        Link evidence to topics and projects to populate the knowledge map.
      </div>
    );
  }

  const width = 100;
  const height = size === "full" ? 72 : 56;
  const heightClass = size === "full" ? "min-h-[min(560px,65vh)] h-[min(560px,65vh)]" : "h-56";

  function handleActivate(id: string, href: string, metaKey: boolean) {
    if (metaKey) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    onSelect?.(id);
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={`w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 ${heightClass}`}
        role="img"
        aria-label="Knowledge treemap — rectangle size is evidence volume, color is recent activity"
      >
        {rects.map((rect) => {
          const pad = 0.35;
          const showLabel = rect.w > 8 && rect.h > 5;
          return (
            <g
              key={rect.id}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`${rect.name}, ${rect.evidenceCount} evidence`}
              onClick={(event) => handleActivate(rect.id, rect.href, event.metaKey)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleActivate(rect.id, rect.href, event.metaKey);
                }
              }}
            >
              <rect
                x={rect.x + pad}
                y={rect.y + pad}
                width={Math.max(0, rect.w - pad * 2)}
                height={Math.max(0, rect.h - pad * 2)}
                rx={0.8}
                fill={activityColor(rect.recentActivity)}
                stroke={
                  rect.tagPatternCount > 0 ? "rgba(248, 113, 113, 0.85)" : "rgba(9, 9, 11, 0.9)"
                }
                strokeWidth={rect.tagPatternCount > 0 ? 0.65 : 0.4}
                className="transition hover:brightness-125"
              />
              {showLabel ? (
                <>
                  <text
                    x={rect.x + rect.w / 2}
                    y={rect.y + rect.h / 2 - 0.8}
                    textAnchor="middle"
                    fill="rgb(244, 244, 245)"
                    fontSize={Math.min(2.8, rect.w / 4)}
                    fontWeight={600}
                    pointerEvents="none"
                  >
                    {rect.name.length > 14 ? `${rect.name.slice(0, 12)}…` : rect.name}
                  </text>
                  <text
                    x={rect.x + rect.w / 2}
                    y={rect.y + rect.h / 2 + 2}
                    textAnchor="middle"
                    fill="rgb(161, 161, 170)"
                    fontSize={1.8}
                    pointerEvents="none"
                  >
                    {rect.evidenceCount} evidence
                  </text>
                </>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-zinc-500">
        <span>Click = lens below · ⌘/Ctrl+click = open focused view</span>
        <span>Size = evidence volume</span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-emerald-500/70" /> Active (7d)
        </span>
      </div>
    </div>
  );
}
