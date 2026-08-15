"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { V2GraphEdge, V2GraphNode } from "@/lib/argus/v2/intelligence-viz";
import { layoutNeighborhoodGraphNodes } from "@/lib/argus/v2/intelligence-viz";
import {
  buildEgoNeighborhoodPreservePositions,
  layoutNeighborhoodMoleculeNodes,
  type NeighborhoodLayoutMode,
} from "@/lib/argus/v2/neighborhood-molecule-layout";
import { V2IntelHelpLink } from "./V2IntelHelpLink";

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
  /** Dock / context rail — small icons; hover expands. */
  compact: {
    heightClass: "h-56",
    nodeBase: 2.1,
    nodeScale: 0.9,
    fontSize: 1.7,
    labelOffset: 4.5,
  },
  /** Inline local neighborhood — still compact; spacing carries hierarchy. */
  full: {
    heightClass: "min-h-[min(480px,55vh)] h-[min(480px,55vh)]",
    nodeBase: 2.4,
    nodeScale: 1.0,
    fontSize: 1.9,
    labelOffset: 5,
  },
  /**
   * Large view — more canvas, NOT bigger icons (context dock separation is clearer).
   * Same small node language as full; hover still expands the icon.
   */
  expanded: {
    heightClass: "min-h-0 flex-1 w-full",
    nodeBase: 2.6,
    nodeScale: 1.1,
    fontSize: 2.1,
    labelOffset: 5.5,
  },
};

/** Hover grows the icon; default stays small so degree spacing stays readable. */
const HOVER_SCALE = 1.55;

/** Direct neighbors of focusId within the given edge set (ego view). Radial re-layout. */
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
    nodes: layoutNeighborhoodGraphNodes(subNodes, focusId, subEdges),
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
        <span className="inline-flex items-center gap-1.5" title="Evidence on this node carries a Tracker Tag">
          <span
            className="h-2.5 w-2.5 rounded-full border border-dashed border-amber-400/90 bg-rose-500/20"
            aria-hidden
          />
          Tracker
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
  layoutMode = "radial",
  emphasizeIds,
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
  layoutMode?: NeighborhoodLayoutMode;
  /** When set (Molecule microscope), non-members are subdued in place. */
  emphasizeIds?: Set<string> | null;
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
  const showRadialGuide = layout === "neighborhood" && layoutMode === "radial" && !emphasizeIds?.size;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className={`w-full rounded-xl border border-zinc-800/80 bg-zinc-950/80 ${cfg.heightClass}`}
      role="img"
      aria-label={
        layout === "neighborhood"
          ? layoutMode === "molecule"
            ? "Entity neighborhood molecule layout — click a node to emphasize its neighbors"
            : "Entity neighborhood graph — click a node to focus its neighbors"
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
      ) : showRadialGuide ? (
        <circle
          cx={50}
          cy={50}
          r={32}
          fill="none"
          stroke="rgba(39, 39, 42, 0.35)"
          strokeWidth={0.3}
          strokeDasharray="1 2"
        />
      ) : null}

      {edges.map((edge) => {
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);
        if (!from || !to) return null;
        const isAffinity = edge.kind === "focus-affinity";
        const inEmphasize =
          !emphasizeIds ||
          emphasizeIds.size === 0 ||
          (emphasizeIds.has(edge.from) && emphasizeIds.has(edge.to));
        const active =
          !hoveredId || edge.from === hoveredId || edge.to === hoveredId || connectedToHover.has(edge.from);
        const subdued = Boolean(emphasizeIds && emphasizeIds.size > 0 && !inEmphasize);
        return (
          <line
            key={`${edge.from}-${edge.to}-${edge.kind ?? "edge"}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={
              subdued
                ? "rgba(63, 63, 70, 0.2)"
                : isAffinity
                  ? active && hoveredId
                    ? "rgba(251, 113, 133, 0.7)"
                    : "rgba(251, 113, 133, 0.35)"
                  : active && hoveredId
                    ? "rgba(139, 92, 246, 0.55)"
                    : "rgba(113, 113, 122, 0.4)"
            }
            strokeWidth={
              subdued
                ? 0.35
                : isAffinity
                  ? active && hoveredId
                    ? 0.7
                    : 0.45
                  : active && hoveredId
                    ? 0.9
                    : Math.min(1.4, 0.5 + edge.weight * 0.25)
            }
            strokeDasharray={isAffinity ? "1.2 1.4" : undefined}
            opacity={subdued ? 0.35 : 1}
          />
        );
      })}

      {nodes.map((node) => {
        const r =
          (centerId === node.id ? cfg.nodeBase * 1.12 : cfg.nodeBase) +
          Math.sqrt(node.evidenceCount / maxEvidence) * cfg.nodeScale;
        const isCenter = centerId === node.id;
        const isHovered = hoveredId === node.id;
        const drawR = isHovered ? r * HOVER_SCALE : r;
        const isConnected = connectedToHover.has(node.id);
        const outOfEmphasize =
          Boolean(emphasizeIds && emphasizeIds.size > 0 && !emphasizeIds.has(node.id));
        const dimmed = (hoveredId && !isHovered && !isConnected) || outOfEmphasize;
        const isFocusCritical = Boolean(node.focusCritical);
        const labelMax = isHovered ? 20 : displaySize === "compact" ? 10 : 14;
        const label =
          node.name.length > labelMax ? `${node.name.slice(0, labelMax - 1)}…` : node.name;
        const focusLabel =
          node.focusTags && node.focusTags.length > 0
            ? ` · Tracker: ${node.focusTags.map((t) => `#${t}`).join(", ")}`
            : "";
        const showDetailLabel = isHovered || isCenter || displaySize === "expanded";

        return (
          <g
            key={node.id}
            opacity={outOfEmphasize ? 0.22 : dimmed ? 0.35 : 1}
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
                <>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={drawR + 2.2}
                    fill="none"
                    stroke="rgb(251, 191, 36)"
                    strokeOpacity={0.9}
                    strokeWidth={0.45}
                    strokeDasharray="1.1 0.85"
                    className="pointer-events-none"
                    aria-hidden
                  />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={drawR + 1.2}
                    fill="none"
                    stroke="rgb(244, 63, 94)"
                    strokeOpacity={0.9}
                    strokeWidth={0.5}
                    className="pointer-events-none"
                    aria-hidden
                  />
                </>
              ) : null}
              <circle
                cx={node.x}
                cy={node.y}
                r={drawR}
                fill={NODE_COLORS[node.kind]}
                fillOpacity={isHovered || isCenter ? 0.95 : 0.72}
                stroke={
                  isCenter
                    ? "rgb(251, 191, 36)"
                    : isFocusCritical
                      ? "rgb(251, 113, 133)"
                      : isHovered
                        ? "rgb(216, 180, 254)"
                        : "rgb(9, 9, 11)"
                }
                strokeWidth={isCenter || isFocusCritical ? 0.85 : isHovered ? 0.7 : 0.35}
                className="cursor-pointer"
                style={{ transition: "r 120ms ease, fill-opacity 120ms ease" }}
              />
              <title>
                {node.name} ({KIND_LABELS[node.kind]}) — {node.evidenceCount} evidence
                {focusLabel}
                {onFocusNode ? " · click to focus neighbors · ⌘/Ctrl+click to open" : ""}
              </title>
            </a>
            <text
              x={node.x}
              y={node.y + (isHovered ? cfg.labelOffset + 1.5 : cfg.labelOffset)}
              textAnchor="middle"
              fill={isHovered ? "rgb(244, 244, 245)" : "rgb(161, 161, 170)"}
              fontSize={isHovered ? cfg.fontSize * 1.25 : cfg.fontSize}
              fontWeight={isHovered ? 600 : 500}
              pointerEvents="none"
            >
              {label}
            </text>
            {showDetailLabel ? (
              <text
                x={node.x}
                y={node.y + cfg.labelOffset + cfg.fontSize * (isHovered ? 1.35 : 0.95)}
                textAnchor="middle"
                fill="rgb(113, 113, 122)"
                fontSize={cfg.fontSize * 0.7}
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
  /** Temporary A/B review toggle — Radial remains production default. */
  const [layoutMode, setLayoutMode] = useState<NeighborhoodLayoutMode>("radial");

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

  const moleculeNodes = useMemo(() => {
    if (layout !== "neighborhood" || layoutMode !== "molecule" || !centerId) return null;
    return layoutNeighborhoodMoleculeNodes(nodes, edges, centerId);
  }, [nodes, edges, centerId, layout, layoutMode]);

  const worldNodes = layoutMode === "molecule" && moleculeNodes ? moleculeNodes : nodes;

  const focusedView = useMemo(() => {
    if (!focusId || layout !== "neighborhood") {
      return {
        nodes: worldNodes,
        edges,
        centerId,
        emphasizeIds: null as Set<string> | null,
      };
    }

    if (layoutMode === "molecule") {
      // Map → microscope: keep full Molecule world, subdue non-1-hop (no re-layout).
      const ego = buildEgoNeighborhoodPreservePositions(worldNodes, edges, focusId);
      const emphasizeIds = new Set(ego.nodes.map((n) => n.id));
      return {
        nodes: worldNodes,
        edges,
        centerId: focusId,
        emphasizeIds,
      };
    }

    const ego = buildEgoNeighborhood(worldNodes, edges, focusId);
    return { nodes: ego.nodes, edges: ego.edges, centerId: focusId, emphasizeIds: null };
  }, [worldNodes, edges, focusId, layout, centerId, layoutMode]);

  const focusNode = worldNodes.find((n) => n.id === focusId);
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
  const layoutToggle =
    layout === "neighborhood" ? (
      <div
        className="flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-950/70 p-0.5"
        role="group"
        aria-label="Neighborhood layout experiment"
      >
        {(
          [
            { id: "radial" as const, label: "Radial" },
            { id: "molecule" as const, label: "Molecule" },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={layoutMode === option.id}
            onClick={() => {
              setLayoutMode(option.id);
              // Keep focus id; Molecule preserves world, Radial re-layouts ego.
            }}
            className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
              layoutMode === option.id
                ? "bg-violet-600/25 text-violet-200"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            title={
              option.id === "radial"
                ? "Production radial layout"
                : "Experimental weighted-force molecule layout (A/B review)"
            }
          >
            {option.label}
          </button>
        ))}
      </div>
    ) : null;

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

  const expandHint = focusId
    ? layoutMode === "molecule"
      ? "Focused neighbors stay in place; others fade. Esc or Back."
      : "Direct neighbors only — spaced by link count. Esc or Back."
    : "Small icons · hover to enlarge · 4+ link hubs sit slightly farther";

  return (
    <>
      <div>
        {size === "full" ? (
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-zinc-600">
              {focusId
                ? `Focused · ${focusNode?.name ?? "node"} (${
                    layoutMode === "molecule" && focusedView.emphasizeIds
                      ? focusedView.emphasizeIds.size
                      : focusedView.nodes.length
                  })`
                : `${focusedView.nodes.length} nodes · chem-lite bonds · hop rings · 4+ slight outer`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {layoutToggle}
              <V2IntelHelpLink topic="neighborhood" label="Help" />
              {focusControls}
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="rounded-lg border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-600/25"
              >
                Large view
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            {layoutToggle}
            {focusId ? focusControls : null}
          </div>
        )}
        <GraphCanvas
          nodes={focusedView.nodes}
          edges={focusedView.edges}
          displaySize={displaySize}
          hoveredId={hoveredId}
          onHover={setHoveredId}
          centerId={focusedView.centerId}
          layout={layout}
          layoutMode={layoutMode}
          emphasizeIds={focusedView.emphasizeIds}
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
          aria-label="Neighborhood large view"
        >
          <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-zinc-100">
                {focusId
                  ? `Local neighborhood · ${focusNode?.name ?? "node"}`
                  : "Local neighborhood"}
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                {expandHint} · Context (parent frame) stays in the side rail — this view stays local.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {layoutToggle}
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
          <div className="mb-3 flex shrink-0 flex-wrap gap-3 text-[11px] text-zinc-500">
            <span className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1">
              Chem bond unit shared
            </span>
            <span className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1">
              1–3 links · near (uniform)
            </span>
            <span className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1">
              4+ links · slight outer
            </span>
            <span className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1">
              Hop-2 farther than hop-1
            </span>
            <span className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1">
              Hover icon to enlarge
            </span>
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
              layoutMode={layoutMode}
              emphasizeIds={focusedView.emphasizeIds}
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
