"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D, { type ForceGraphMethods } from "react-force-graph-3d";
import SpriteText from "three-spritetext";
import type { Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import type { ArgusRelation, ArgusUnit } from "@/lib/argusforge/argus-graph-types";
import {
  buildFocusSets,
  buildSpatialModel,
  centroidOfNodes,
  createCollisionForce,
  dimHex,
  forceTowardCenters,
  layoutForceStrengths,
  nodeHasCoords,
  relationIsDirected,
  toForceGraph3DData,
  unitTypeColor,
  type Argus3DFocusMode,
  type Argus3DLayoutMode,
  type ArgusGraph3DLink,
  type ArgusGraph3DNode,
} from "@/lib/argusforge/argus-graph-3d-adapter";

type Props = {
  units: ArgusUnit[];
  relations: ArgusRelation[];
  repo: Af03RepoState | null;
  selectedId: string | null;
  onSelect: (unitId: string | null) => void;
};

type GraphRef = ForceGraphMethods<ArgusGraph3DNode, ArgusGraph3DLink> | undefined;

function focusCameraOnPoint(
  fg: NonNullable<GraphRef>,
  point: { x: number; y: number; z: number },
  ms = 700
): void {
  const distance = 160;
  const hypot = Math.hypot(point.x, point.y, point.z) || 1;
  const ratio = 1 + distance / hypot;
  fg.cameraPosition(
    { x: point.x * ratio, y: point.y * ratio, z: point.z * ratio },
    point,
    ms
  );
}

export function ArgusGraph3DView({ units, relations, repo, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<GraphRef>(undefined);
  const [size, setSize] = useState({ width: 320, height: 360 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<Argus3DLayoutMode>("molecule");
  const [focusMode, setFocusMode] = useState<Argus3DFocusMode>("all");
  const [focusOrganizationId, setFocusOrganizationId] = useState<string | null>(null);
  const [focusProjectId, setFocusProjectId] = useState<string | null>(null);
  const [engineEpoch, setEngineEpoch] = useState(0);

  const graphData = useMemo(
    () => toForceGraph3DData(units, relations, repo),
    [units, relations, repo]
  );

  const spatial = useMemo(
    () => buildSpatialModel(graphData.nodes, layoutMode),
    [graphData.nodes, layoutMode]
  );

  const orgOptions = useMemo(() => {
    return [...spatial.orgLabels.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [spatial.orgLabels]);

  const projectOptions = useMemo(() => {
    const orgFilter = focusOrganizationId;
    return graphData.nodes
      .filter((n) => !orgFilter || n.organizationId === orgFilter)
      .reduce<Array<{ id: string; label: string }>>((acc, node) => {
        if (!acc.some((p) => p.id === node.projectId)) {
          acc.push({ id: node.projectId, label: node.projectLabel });
        }
        return acc;
      }, [])
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [graphData.nodes, focusOrganizationId]);

  const { highlightNodeIds, highlightLinkIds } = useMemo(
    () =>
      buildFocusSets(
        focusMode,
        selectedId,
        graphData.nodes,
        graphData.links,
        focusOrganizationId,
        focusProjectId
      ),
    [
      focusMode,
      selectedId,
      graphData.nodes,
      graphData.links,
      focusOrganizationId,
      focusProjectId,
    ]
  );

  const focusActive = focusMode !== "all" && highlightNodeIds.size > 0;

  const labelIds = useMemo(() => {
    const set = new Set<string>();
    if (selectedId) set.add(selectedId);
    if (hoverId) set.add(hoverId);
    if (focusMode === "unit") {
      for (const id of highlightNodeIds) set.add(id);
    } else if (focusActive) {
      // Project / org focus: label a sample of highlighted nodes (cap for perf).
      let i = 0;
      for (const id of highlightNodeIds) {
        set.add(id);
        i += 1;
        if (i >= 12) break;
      }
    }
    return set;
  }, [selectedId, hoverId, focusMode, focusActive, highlightNodeIds]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const apply = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.max(240, Math.floor(rect.width)),
        height: Math.max(280, Math.floor(rect.height)),
      });
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const renderer = fg.renderer();
    if (renderer?.setPixelRatio) {
      const cap = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 1.5) : 1;
      renderer.setPixelRatio(cap);
    }
  }, [size.width, size.height]);

  const applyForces = useCallback(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const s = layoutForceStrengths(layoutMode);
    const model = buildSpatialModel(graphData.nodes, layoutMode);

    const charge = fg.d3Force("charge") as { strength?: (v: number) => void } | null;
    charge?.strength?.(s.charge);

    const linkForce = fg.d3Force("link") as {
      distance?: (fn: (l: ArgusGraph3DLink) => number) => void;
      strength?: (fn: (l: ArgusGraph3DLink) => number) => void;
    } | null;
    linkForce?.distance?.((link) => {
      if (link.crossOrganization) return s.linkDistCrossOrg;
      if (link.crossProject) return s.linkDistCrossProject;
      return s.linkDistInternal;
    });
    linkForce?.strength?.((link) => {
      if (link.crossOrganization) return s.linkCrossOrg;
      if (link.crossProject) return s.linkCrossProject;
      return s.linkInternal;
    });

    fg.d3Force(
      "orgPull",
      forceTowardCenters((node) => model.orgCenters.get(node.organizationId), s.org)
    );
    fg.d3Force(
      "projectPull",
      forceTowardCenters((node) => model.projectCenters.get(node.projectId), s.project)
    );
    fg.d3Force("collide", createCollisionForce(s.collide));
    fg.d3ReheatSimulation();
  }, [graphData.nodes, layoutMode]);

  useEffect(() => {
    applyForces();
  }, [applyForces, engineEpoch]);

  useEffect(() => {
    if (!selectedId) return;
    const node = graphData.nodes.find((n) => n.id === selectedId);
    if (!node) return;
    if (focusMode === "all") setFocusMode("unit");
    setFocusOrganizationId(node.organizationId);
    setFocusProjectId(node.projectId);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps -- intentional: selection drives focus context once

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    let attempts = 0;
    const tryFocus = () => {
      attempts += 1;
      if (selectedId && focusMode === "unit") {
        const live = graphData.nodes.find((n) => n.id === selectedId);
        if (live && nodeHasCoords(live)) {
          focusCameraOnPoint(fg, {
            x: live.x as number,
            y: live.y as number,
            z: live.z as number,
          });
          return;
        }
      } else if (focusMode === "project" && focusProjectId) {
        const members = graphData.nodes.filter((n) => n.projectId === focusProjectId);
        const c = centroidOfNodes(members) ?? spatial.projectCenters.get(focusProjectId);
        if (c) {
          focusCameraOnPoint(fg, c);
          return;
        }
      } else if (focusMode === "organization" && focusOrganizationId) {
        const members = graphData.nodes.filter((n) => n.organizationId === focusOrganizationId);
        const c = centroidOfNodes(members) ?? spatial.orgCenters.get(focusOrganizationId);
        if (c) {
          focusCameraOnPoint(fg, c);
          return;
        }
      }
      if (attempts < 14) window.setTimeout(tryFocus, 90);
    };
    const timer = window.setTimeout(tryFocus, 80);
    return () => window.clearTimeout(timer);
  }, [
    selectedId,
    focusMode,
    focusProjectId,
    focusOrganizationId,
    graphData.nodes,
    spatial.orgCenters,
    spatial.projectCenters,
  ]);

  const nodeColor = useCallback(
    (node: ArgusGraph3DNode) => {
      const base = unitTypeColor(node.unit.unitType);
      if (!focusActive) return base;
      if (highlightNodeIds.has(node.id)) return base;
      return dimHex(base, 0.72);
    },
    [focusActive, highlightNodeIds]
  );

  const nodeVal = useCallback(
    (node: ArgusGraph3DNode) => {
      const degree = 1 + Math.min(node.relationCount, 8) * 0.18;
      if (node.id === selectedId) return degree * 2.2;
      if (highlightNodeIds.has(node.id)) return degree * 1.35;
      return degree;
    },
    [selectedId, highlightNodeIds]
  );

  const linkColor = useCallback(
    (link: ArgusGraph3DLink) => {
      const confirmed = link.relation.confirmed;
      const selectedLink = highlightLinkIds.has(link.id);
      if (focusActive && !selectedLink) {
        return confirmed ? "rgba(63,63,70,0.2)" : "rgba(39,39,42,0.12)";
      }
      if (link.crossOrganization) {
        return confirmed
          ? selectedLink
            ? "rgba(251,191,36,0.95)"
            : "rgba(251,191,36,0.55)"
          : "rgba(251,191,36,0.28)";
      }
      if (link.crossProject) {
        return confirmed
          ? selectedLink
            ? "rgba(56,189,248,0.95)"
            : "rgba(56,189,248,0.5)"
          : "rgba(56,189,248,0.25)";
      }
      return confirmed
        ? selectedLink
          ? "rgba(228,228,231,0.95)"
          : "rgba(161,161,170,0.7)"
        : selectedLink
          ? "rgba(161,161,170,0.65)"
          : "rgba(82,82,91,0.35)";
    },
    [focusActive, highlightLinkIds]
  );

  const linkWidth = useCallback(
    (link: ArgusGraph3DLink) => {
      if (highlightLinkIds.has(link.id)) return link.crossOrganization ? 2 : 1.5;
      if (link.crossOrganization) return 1.2;
      if (link.crossProject) return 0.9;
      return link.relation.confirmed ? 0.55 : 0.3;
    },
    [highlightLinkIds]
  );

  const linkDirectionalArrowLength = useCallback(
    (link: ArgusGraph3DLink) => (relationIsDirected(link.relation.type) ? 3.2 : 0),
    []
  );

  const linkDirectionalParticles = useCallback(
    (link: ArgusGraph3DLink) => (highlightLinkIds.has(link.id) ? 2 : 0),
    [highlightLinkIds]
  );

  const nodeLabel = useCallback((node: ArgusGraph3DNode) => {
    return `${node.unit.label}\n${node.organizationLabel} · ${node.projectLabel}`;
  }, []);

  const nodeThreeObject = useCallback(
    (node: ArgusGraph3DNode) => {
      if (!labelIds.has(node.id)) return null;
      const sprite = new SpriteText(node.unit.label || node.id);
      sprite.color = node.id === selectedId ? "#fafafa" : "#d4d4d8";
      sprite.textHeight = node.id === selectedId ? 4.2 : 3.1;
      sprite.backgroundColor = "rgba(9,9,11,0.72)";
      sprite.padding = 1.5;
      sprite.borderRadius = 2;
      return sprite;
    },
    [labelIds, selectedId]
  );

  function handleReheat() {
    setEngineEpoch((n) => n + 1);
    fgRef.current?.d3ReheatSimulation();
  }

  function handleFit() {
    fgRef.current?.zoomToFit(500, 48);
  }

  function handleFocusCamera() {
    const fg = fgRef.current;
    if (!fg) return;
    if (selectedId) {
      const live = graphData.nodes.find((n) => n.id === selectedId);
      if (live && nodeHasCoords(live)) {
        focusCameraOnPoint(fg, {
          x: live.x as number,
          y: live.y as number,
          z: live.z as number,
        });
        return;
      }
    }
    if (focusMode === "project" && focusProjectId) {
      const c =
        centroidOfNodes(graphData.nodes.filter((n) => n.projectId === focusProjectId)) ??
        spatial.projectCenters.get(focusProjectId);
      if (c) focusCameraOnPoint(fg, c);
      return;
    }
    if (focusMode === "organization" && focusOrganizationId) {
      const c =
        centroidOfNodes(graphData.nodes.filter((n) => n.organizationId === focusOrganizationId)) ??
        spatial.orgCenters.get(focusOrganizationId);
      if (c) focusCameraOnPoint(fg, c);
      return;
    }
    fg.zoomToFit(500, 48);
  }

  function handleReset() {
    for (const node of graphData.nodes) {
      node.fx = undefined;
      node.fy = undefined;
      node.fz = undefined;
    }
    setFocusMode("all");
    setFocusOrganizationId(null);
    setFocusProjectId(null);
    onSelect(null);
    setEngineEpoch((n) => n + 1);
    window.setTimeout(() => fgRef.current?.zoomToFit(500, 48), 200);
  }

  return (
    <div ref={containerRef} className="relative h-full min-h-[280px] w-full bg-zinc-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap gap-2 p-2">
        <label className="pointer-events-auto flex min-h-10 items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-950/90 px-2 text-[10px] text-zinc-400 backdrop-blur">
          Layout
          <select
            className="min-h-8 bg-transparent text-xs text-zinc-200 outline-none"
            value={layoutMode}
            onChange={(e) => setLayoutMode(e.target.value as Argus3DLayoutMode)}
          >
            <option value="molecule">Molecule</option>
            <option value="organizations">Organizations</option>
            <option value="projects">Projects</option>
            <option value="relations">Relations</option>
          </select>
        </label>
        <label className="pointer-events-auto flex min-h-10 items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-950/90 px-2 text-[10px] text-zinc-400 backdrop-blur">
          Focus
          <select
            className="min-h-8 bg-transparent text-xs text-zinc-200 outline-none"
            value={focusMode}
            onChange={(e) => setFocusMode(e.target.value as Argus3DFocusMode)}
          >
            <option value="all">All</option>
            <option value="organization">Organization</option>
            <option value="project">Project</option>
            <option value="unit">Unit</option>
          </select>
        </label>
        {focusMode === "organization" || focusMode === "project" ? (
          <label className="pointer-events-auto flex min-h-10 max-w-[10rem] items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-950/90 px-2 text-[10px] text-zinc-400 backdrop-blur">
            Org
            <select
              className="min-h-8 max-w-[7rem] truncate bg-transparent text-xs text-zinc-200 outline-none"
              value={focusOrganizationId ?? ""}
              onChange={(e) => {
                setFocusOrganizationId(e.target.value || null);
                setFocusProjectId(null);
              }}
            >
              <option value="">—</option>
              {orgOptions.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {focusMode === "project" ? (
          <label className="pointer-events-auto flex min-h-10 max-w-[10rem] items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-950/90 px-2 text-[10px] text-zinc-400 backdrop-blur">
            Project
            <select
              className="min-h-8 max-w-[7rem] truncate bg-transparent text-xs text-zinc-200 outline-none"
              value={focusProjectId ?? ""}
              onChange={(e) => setFocusProjectId(e.target.value || null)}
            >
              <option value="">—</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="touch-none absolute inset-0 pt-12">
        <ForceGraph3D
          ref={fgRef as never}
          width={size.width}
          height={Math.max(240, size.height - 8)}
          graphData={graphData}
          backgroundColor="#09090b"
          showNavInfo={false}
          nodeId="id"
          linkSource="source"
          linkTarget="target"
          nodeRelSize={4}
          nodeVal={nodeVal}
          nodeColor={nodeColor}
          nodeOpacity={0.95}
          nodeResolution={10}
          nodeLabel={nodeLabel}
          nodeThreeObject={nodeThreeObject as never}
          nodeThreeObjectExtend={true}
          linkColor={linkColor}
          linkWidth={linkWidth}
          linkOpacity={1}
          linkDirectionalParticles={linkDirectionalParticles}
          linkDirectionalParticleWidth={1.2}
          linkDirectionalParticleSpeed={0.004}
          linkDirectionalArrowLength={linkDirectionalArrowLength}
          linkDirectionalArrowRelPos={1}
          enableNodeDrag
          enableNavigationControls
          controlType="orbit"
          cooldownTicks={110}
          cooldownTime={7000}
          d3VelocityDecay={0.38}
          d3AlphaDecay={0.035}
          onEngineStop={() => {
            /* settled */
          }}
          onNodeClick={(node) => {
            const n = node as ArgusGraph3DNode;
            onSelect(n.id);
            setFocusMode("unit");
            setFocusOrganizationId(n.organizationId);
            setFocusProjectId(n.projectId);
          }}
          onBackgroundClick={() => {
            onSelect(null);
            if (focusMode === "unit") setFocusMode("all");
          }}
          onNodeHover={(node) => setHoverId(node ? (node as ArgusGraph3DNode).id : null)}
          onNodeDragEnd={(node) => {
            const n = node as ArgusGraph3DNode;
            n.fx = n.x;
            n.fy = n.y;
            n.fz = n.z;
          }}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-wrap justify-center gap-2 p-2 sm:justify-end">
        <button
          type="button"
          onClick={handleReheat}
          className="pointer-events-auto min-h-10 min-w-10 rounded-lg border border-zinc-700 bg-zinc-950/90 px-3 text-xs font-medium text-zinc-200 backdrop-blur"
        >
          Reheat
        </button>
        <button
          type="button"
          onClick={handleFit}
          className="pointer-events-auto min-h-10 min-w-10 rounded-lg border border-zinc-700 bg-zinc-950/90 px-3 text-xs font-medium text-zinc-200 backdrop-blur"
        >
          Fit
        </button>
        <button
          type="button"
          onClick={handleFocusCamera}
          className="pointer-events-auto min-h-10 min-w-10 rounded-lg border border-zinc-700 bg-zinc-950/90 px-3 text-xs font-medium text-zinc-200 backdrop-blur"
        >
          Focus
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="pointer-events-auto min-h-10 min-w-10 rounded-lg border border-zinc-700 bg-zinc-950/90 px-3 text-xs font-medium text-zinc-200 backdrop-blur"
        >
          Reset
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-14 left-2 rounded bg-zinc-950/80 px-2 py-1 text-[10px] text-zinc-500 sm:bottom-2">
        <span className="text-zinc-400">amber</span> cross-org ·{" "}
        <span className="text-sky-400">sky</span> cross-project · gray internal
      </div>
    </div>
  );
}
