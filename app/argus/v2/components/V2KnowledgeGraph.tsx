"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { V2GraphEdge, V2GraphNode } from "@/lib/argus/v2/intelligence-viz";
import { layoutNeighborhoodGraphNodes } from "@/lib/argus/v2/intelligence-viz";

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

type GraphDisplaySize = "compact" | "full" | "expanded";

const SIZE_CONFIG: Record<
  GraphDisplaySize,
  { heightClass: string; nodeBase: number; nodeScale: number; fontSize: number; labelOffset: number }
> = {
  compact: {
    heightClass: "h-56",
    nodeBase: 3.5,
    nodeScale: 1.8,
    fontSize: 2.2,
    labelOffset: 7,
  },
  full: {
    heightClass: "min-h-[min(560px,65vh)] h-[min(560px,65vh)]",
    nodeBase: 5.5,
    nodeScale: 2.5,
    fontSize: 3.4,
    labelOffset: 9,
  },
  expanded: {
    heightClass: "min-h-0 flex-1 w-full",
    nodeBase: 7.5,
    nodeScale: 3,
    fontSize: 4.2,
    labelOffset: 11,
  },
};

/** Direct neighbors of focusId within the given edge set (ego view). */
export function buildEgoNeighborhood(
  nodes: V2GraphNode[],
  edges: V2GraphEdge[],
  focusId: string
): { nodes: V2GraphNode[]; edges: V2GraphEdge[] } {
  const neighborIds = new Set<string>([focusId]);
  for (const edge of edges) {
    if (edge.from === focusId) neighborIds.add(edge.to);
    if (edge.to === focusId) neighborIds.add(edge.from);
  }
  const subNodes = nodes.filter((n) => neighborIds.has(n.id));
  const subEdges = edges.filter((e) => neighborIds.has(e.from) && neighborIds.has(e.to));
  return {
    nodes: layoutNeighborhoodGraphNodes(subNodes, focusId),
    edges: subEdges,
  };
}

function GraphLegend({ showFocusTrigger = false }: { showFocusTrigger?: boolean }) {
  return (
    <div className="flex flex-wrap gap-3 text-[11px] text-zinc-500">
      {(["organization", "project", "person", "topic", "event"] as const).map((kind) => (
        <span key={kind} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: NODE_COLORS[kind] }} />
          {KIND_LABELS[kind]}
        </span>
      ))}
      {showFocusTrigger ? (
        <span className="inline-flex items-center gap-1.5" title="Evidence on this node carries a Focus Tag">
          <span
            className="h-2.5 w-2.5 rounded-full border border-dashed border-rose-400/80 bg-transparent"
            aria-hidden
          />
          Focus trigger
        </span>
      ) : null}
    </div>
  );
}

function GraphCanvas({
  nodes,
  edges,
  displaySize,
  hoveredId,
  onHover,
  centerId,
  layout,
  onFocusNode,
}: {
  nodes: V2GraphNode[];
  edges: V2GraphEdge[];
  displaySize: GraphDisplaySize;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  centerId?: string;
  layout: "columns" | "neighborhood";
  /** Click focuses ego neighborhood. Meta/Ctrl+click opens the entity. */
  onFocusNode?: (id: string) => void;
}) {
  const cfg = SIZE_CONFIG[displaySize];
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const connectedToHover = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    const set = new Set<string>([hoveredId]);
    for (const edge of edges) {
      if (edge.from === hoveredId) set.add(edge.to);
      if (edge.to === hoveredId) set.add(edge.from);
    }
    return set;
  }, [edges, hoveredId]);

  const maxEvidence = Math.max(...nodes.map((n) => n.evidenceCount), 1);

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className={`w-full rounded-xl border border-zinc-800/80 bg-zinc-950/80 ${cfg.heightClass}`}
      role="img"
      aria-label={
        layout === "neighborhood"
          ? "Entity neighborhood graph — click a node to focus its neighbors"
          : "Relationship graph of linked entities"
      }
    >
      {layout === "columns" ? (
        [14, 32, 50, 68, 86].map((x) => (
          <line
            key={x}
            x1={x}
            y1={10}
            x2={x}
            y2={90}
            stroke="rgba(39, 39, 42, 0.35)"
            strokeWidth={0.3}
            strokeDasharray="1 2"
          />
        ))
      ) : (
        <circle
          cx={50}
          cy={50}
          r={32}
          fill="none"
          stroke="rgba(39, 39, 42, 0.35)"
          strokeWidth={0.3}
          strokeDasharray="1 2"
        />
      )}

      {edges.map((edge) => {
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);
        if (!from || !to) return null;
        const isAffinity = edge.kind === "focus-affinity";
        const active =
          !hoveredId || edge.from === hoveredId || edge.to === hoveredId || connectedToHover.has(edge.from);
        return (
          <line
            key={`${edge.from}-${edge.to}-${edge.kind ?? "edge"}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={
              isAffinity
                ? active && hoveredId
                  ? "rgba(251, 113, 133, 0.7)"
                  : "rgba(251, 113, 133, 0.35)"
                : active && hoveredId
                  ? "rgba(139, 92, 246, 0.55)"
                  : "rgba(113, 113, 122, 0.4)"
            }
            strokeWidth={
              isAffinity
                ? active && hoveredId
                  ? 0.7
                  : 0.45
                : active && hoveredId
                  ? 0.9
                  : Math.min(1.4, 0.5 + edge.weight * 0.25)
            }
            strokeDasharray={isAffinity ? "1.2 1.4" : undefined}
          />
        );
      })}

      {nodes.map((node) => {
        const r =
          (centerId === node.id ? cfg.nodeBase * 1.15 : cfg.nodeBase) +
          Math.sqrt(node.evidenceCount / maxEvidence) * cfg.nodeScale;
        const isCenter = centerId === node.id;
        const isHovered = hoveredId === node.id;
        const isConnected = connectedToHover.has(node.id);
        const dimmed = hoveredId && !isHovered && !isConnected;
        const isFocusCritical = Boolean(node.focusCritical);
        const label =
          node.name.length > (displaySize === "expanded" ? 18 : 14)
            ? `${node.name.slice(0, displaySize === "expanded" ? 16 : 12)}…`
            : node.name;
        const focusLabel =
          node.focusTags && node.focusTags.length > 0
            ? ` · Focus trigger: ${node.focusTags.map((t) => `#${t}`).join(", ")}`
            : "";

        return (
          <g
            key={node.id}
            opacity={dimmed ? 0.35 : 1}
            onMouseEnter={() => onHover(node.id)}
            onMouseLeave={() => onHover(null)}
          >
            <a
              href={node.href}
              onClick={(event) => {
                if (!onFocusNode) return;
                if (event.metaKey || event.ctrlKey) return;
                event.preventDefault();
                onFocusNode(node.id);
              }}
            >
              {isFocusCritical ? (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={(isHovered ? r * 1.15 : r) + 2.2}
                  fill="none"
                  stroke="rgb(251, 113, 133)"
                  strokeOpacity={0.85}
                  strokeWidth={0.7}
                  strokeDasharray="1.4 1.2"
                  className="pointer-events-none"
                  aria-hidden
                />
              ) : null}
              <circle
                cx={node.x}
                cy={node.y}
                r={isHovered ? r * 1.15 : r}
                fill={NODE_COLORS[node.kind]}
                fillOpacity={isHovered || isCenter ? 0.95 : 0.75}
                stroke={
                  isCenter
                    ? "rgb(251, 191, 36)"
                    : isFocusCritical
                      ? "rgb(251, 113, 133)"
                      : isHovered
                        ? "rgb(216, 180, 254)"
                        : "rgb(9, 9, 11)"
                }
                strokeWidth={isCenter || isFocusCritical ? 1 : isHovered ? 0.8 : 0.4}
                className="cursor-pointer transition-all duration-150"
              />
              <title>
                {node.name} ({KIND_LABELS[node.kind]}) — {node.evidenceCount} evidence
                {focusLabel}
                {onFocusNode ? " · click to focus neighbors · ⌘/Ctrl+click to open" : ""}
              </title>
            </a>
            <text
              x={node.x}
              y={node.y + cfg.labelOffset}
              textAnchor="middle"
              fill={isHovered ? "rgb(244, 244, 245)" : "rgb(161, 161, 170)"}
              fontSize={cfg.fontSize}
              fontWeight={isHovered ? 600 : 500}
              pointerEvents="none"
            >
              {label}
            </text>
            {displaySize !== "compact" ? (
              <text
                x={node.x}
                y={node.y + cfg.labelOffset + cfg.fontSize * 0.9}
                textAnchor="middle"
                fill="rgb(113, 113, 122)"
                fontSize={cfg.fontSize * 0.65}
                pointerEvents="none"
              >
                {node.evidenceCount} evidence
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function V2KnowledgeGraph({
  nodes,
  edges,
  size = "compact",
  centerId,
  layout = "columns",
}: {
  nodes: V2GraphNode[];
  edges: V2GraphEdge[];
  size?: "compact" | "full";
  centerId?: string;
  layout?: "columns" | "neighborhood";
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  /** null = full neighborhood; otherwise ego center id */
  const [focusId, setFocusId] = useState<string | null>(null);
  /** Previous focus centers for Back */
  const [focusStack, setFocusStack] = useState<string[]>([]);

  useEffect(() => {
    setFocusId(null);
    setFocusStack([]);
    setHoveredId(null);
  }, [centerId]);

  const goBack = useCallback(() => {
    setFocusStack((stack) => {
      if (stack.length === 0) {
        setFocusId(null);
        return stack;
      }
      const next = [...stack];
      const prev = next.pop()!;
      setFocusId(prev);
      return next;
    });
    setHoveredId(null);
  }, []);

  const showFull = useCallback(() => {
    setFocusId(null);
    setFocusStack([]);
    setHoveredId(null);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (focusId) {
          goBack();
          return;
        }
        setExpanded(false);
      }
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded, focusId, goBack]);

  const focusedView = useMemo(() => {
    if (!focusId || layout !== "neighborhood") {
      return { nodes, edges, centerId };
    }
    const ego = buildEgoNeighborhood(nodes, edges, focusId);
    return { nodes: ego.nodes, edges: ego.edges, centerId: focusId };
  }, [nodes, edges, focusId, layout, centerId]);

  const focusNode = nodes.find((n) => n.id === focusId);
  const canFocus = layout === "neighborhood";

  function goFocus(id: string) {
    if (!canFocus) return;
    if (id === focusId) return;
    setFocusStack((stack) => (focusId ? [...stack, focusId] : stack));
    setFocusId(id);
    setHoveredId(null);
  }

  if (nodes.length === 0) {
    const heightClass = size === "full" ? SIZE_CONFIG.full.heightClass : SIZE_CONFIG.compact.heightClass;
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-dashed border-zinc-800 text-sm text-zinc-500 ${heightClass}`}
      >
        Link people, projects, and topics to see the relationship graph.
      </div>
    );
  }

  const displaySize: GraphDisplaySize = size === "full" ? "full" : "compact";
  const focusControls =
    canFocus && (focusId || size === "full") ? (
      <div className="flex flex-wrap items-center gap-2">
        {focusId ? (
          <>
            <button
              type="button"
              onClick={goBack}
              className="rounded-lg border border-zinc-700 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={showFull}
              className="rounded-lg border border-violet-500/40 bg-violet-600/15 px-2.5 py-1 text-[11px] font-semibold text-violet-300 hover:bg-violet-600/25"
            >
              Full neighborhood
            </button>
            {focusNode ? (
              <a
                href={focusNode.href}
                className="rounded-lg border border-zinc-700 px-2.5 py-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-200"
              >
                Open {focusNode.name} →
              </a>
            ) : null}
          </>
        ) : null}
      </div>
    ) : null;

  const hint = canFocus
    ? focusId
      ? `Focused on ${focusNode?.name ?? "node"} — only direct neighbors. Esc or Back to return.`
      : "Click a node to focus its neighbors · ⌘/Ctrl+click to open · Expand for a larger canvas"
    : "Hover to highlight connections · click node to open entity";

  return (
    <>
      <div>
        {size === "full" ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-zinc-600">{hint}</p>
            <div className="flex flex-wrap items-center gap-2">
              {focusControls}
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="rounded-lg border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-600/25"
              >
                Expand graph
              </button>
            </div>
          </div>
        ) : null}
        {focusId && size !== "full" ? <div className="mb-2">{focusControls}</div> : null}
        {focusId ? (
          <p className="mb-2 rounded-lg border border-amber-500/20 bg-amber-950/20 px-2.5 py-1.5 text-[11px] text-amber-200/90">
            Ego view — <span className="font-semibold">{focusNode?.name}</span> and direct neighbors only (
            {focusedView.nodes.length} nodes). Not the full universe.
          </p>
        ) : null}
        <GraphCanvas
          nodes={focusedView.nodes}
          edges={focusedView.edges}
          displaySize={displaySize}
          hoveredId={hoveredId}
          onHover={setHoveredId}
          centerId={focusedView.centerId}
          layout={layout}
          onFocusNode={canFocus ? goFocus : undefined}
        />
        <div className="mt-3">
          <GraphLegend showFocusTrigger={nodes.some((n) => n.focusCritical)} />
        </div>
      </div>

      {expanded ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-zinc-950/98 p-4 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded relationship graph"
        >
          <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                {focusId ? `Neighbors of ${focusNode?.name ?? "node"}` : "Relationship graph"}
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {focusControls}
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
              >
                Close
              </button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-3">
            <GraphCanvas
              nodes={focusedView.nodes}
              edges={focusedView.edges}
              displaySize="expanded"
              hoveredId={hoveredId}
              onHover={setHoveredId}
              centerId={focusedView.centerId}
              layout={layout}
              onFocusNode={canFocus ? goFocus : undefined}
            />
          </div>
          <div className="mt-3 shrink-0">
            <GraphLegend showFocusTrigger={nodes.some((n) => n.focusCritical)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
