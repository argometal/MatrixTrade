"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type OnNodeDrag,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { emptyOrSeedRepo } from "@/lib/argusforge/af03-repo-store";
import {
  addRelation,
  bootstrapArgusGraph,
  clearDemoUnits,
  collapsedHiddenUnitIds,
  createGroupFromMembers,
  ensureDemoUnits,
  filterUnits,
  groupCentroid,
  removeGroup,
  removeRelation,
  renameGroup,
  setGroupCollapsed,
  setRelationType,
  setUnitType,
  syncUnitsFromChaos,
  updateUnitPosition,
} from "@/lib/argusforge/argus-graph-store";
import {
  ARGUS_UNIT_TYPES,
  type ArgusGraphFilters,
  type ArgusGraphState,
  type ArgusRelationType,
  type ArgusUnit,
  type ArgusUnitType,
} from "@/lib/argusforge/argus-graph-types";
import { ArgusGroupNode, type ArgusGroupNodeData } from "./ArgusGroupNode";
import { ArgusSelectionPanel } from "./ArgusSelectionPanel";
import { ArgusUnitNode, type ArgusNodeData } from "./ArgusUnitNode";

const nodeTypes = { argusUnit: ArgusUnitNode, argusGroup: ArgusGroupNode };

const DEFAULT_FILTERS: ArgusGraphFilters = {
  unitType: "all",
  source: "all",
  chaosDeckId: "all",
  groupId: "all",
  relationPresence: "all",
};

function ArgusGraphCanvas() {
  const [graph, setGraph] = useState<ArgusGraphState>(() => ({
    version: 2,
    units: [],
    relations: [],
    groups: [],
    updatedAt: "",
  }));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<ArgusGraphFilters>(DEFAULT_FILTERS);
  const [ready, setReady] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    setGraph(bootstrapArgusGraph());
    setReady(true);
  }, []);

  const deckOptions = useMemo(() => {
    const repo = typeof window !== "undefined" ? emptyOrSeedRepo() : null;
    const ids = [
      ...new Set(graph.units.map((u) => u.chaosDeckId).filter((id): id is string => !!id)),
    ];
    return ids.map((id) => ({
      id,
      title: repo?.decks.find((d) => d.id === id)?.title ?? id,
    }));
  }, [graph.units]);

  const filteredUnits = useMemo(() => filterUnits(graph, filters), [graph, filters]);
  const hiddenCollapsed = useMemo(() => collapsedHiddenUnitIds(graph), [graph]);
  const visibleUnits = useMemo(
    () => filteredUnits.filter((u) => !hiddenCollapsed.has(u.id)),
    [filteredUnits, hiddenCollapsed]
  );
  const visibleIds = useMemo(() => new Set(visibleUnits.map((u) => u.id)), [visibleUnits]);

  useEffect(() => {
    // Drop selection for units no longer visible
    setSelectedIds((ids) => {
      const next = ids.filter((id) => visibleIds.has(id) || graph.groups.some((g) => g.id === id));
      return next.length === ids.length ? ids : next;
    });
  }, [visibleIds, graph.groups]);

  useEffect(() => {
    if (!ready) return;
    const selectedSet = new Set(selectedIds);

    const unitNodes: Node<ArgusNodeData>[] = visibleUnits.map((unit) => ({
      id: unit.id,
      type: "argusUnit",
      position: unit.position,
      data: { unit, selected: selectedSet.has(unit.id) },
      selected: selectedSet.has(unit.id),
    }));

    const groupNodes: Node<ArgusGroupNodeData>[] = graph.groups.map((group) => {
      const centroid = groupCentroid(graph, group);
      return {
        id: group.id,
        type: "argusGroup",
        position: { x: centroid.x, y: centroid.y - (group.collapsed ? 0 : 70) },
        data: { group, memberCount: group.memberIds.length },
        selectable: true,
        draggable: false,
      };
    });

    setNodes([...unitNodes, ...groupNodes]);

    const visibleRels = graph.relations.filter(
      (r) => visibleIds.has(r.sourceUnitId) && visibleIds.has(r.targetUnitId)
    );
    setEdges(
      visibleRels.map((r) => ({
        id: r.id,
        source: r.sourceUnitId,
        target: r.targetUnitId,
        label: r.type,
        style: { stroke: "#71717a" },
        labelStyle: { fill: "#a1a1aa", fontSize: 10 },
        labelBgStyle: { fill: "#09090b" },
        labelBgPadding: [4, 2] as [number, number],
      }))
    );
  }, [graph, visibleUnits, visibleIds, selectedIds, ready, setNodes, setEdges]);

  const unitsById = useMemo(() => new Map(graph.units.map((u) => [u.id, u])), [graph.units]);
  const singleUnit: ArgusUnit | null =
    selectedIds.length === 1 ? unitsById.get(selectedIds[0]!) ?? null : null;

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    if (connection.source.startsWith("grp_") || connection.target.startsWith("grp_")) return;
    // Default named relation: related_to (user-initiated connect only)
    setGraph((g) => addRelation(g, connection.source!, connection.target!, "related_to"));
  }, []);

  const onNodeDragStop: OnNodeDrag = useCallback((_e, node) => {
    if (node.type === "argusGroup") return;
    setGraph((g) => updateUnitPosition(g, node.id, node.position));
  }, []);

  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const ids = params.nodes
      .filter((n) => n.type === "argusUnit")
      .map((n) => n.id);
    setSelectedIds(ids);
  }, []);

  function handleSync() {
    setGraph((g) => syncUnitsFromChaos(g));
  }

  if (!ready) {
    return <p className="text-sm text-zinc-500">Loading Argus graph…</p>;
  }

  return (
    <div className="space-y-3">
      <header className="space-y-1">
        <h2 className="text-xl font-bold text-zinc-50">Argus</h2>
        <p className="text-xs text-zinc-500">
          Typed units · named relations · groups · filters. Chaos owns content. No AI.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSync}
          className="min-h-10 rounded-lg border border-zinc-700 px-3 text-xs font-medium text-zinc-200"
        >
          Sync from Chaos
        </button>
        <button
          type="button"
          onClick={() => setGraph((g) => ensureDemoUnits(g))}
          className="min-h-10 rounded-lg border border-zinc-800 px-3 text-xs font-medium text-zinc-400"
        >
          Fill demo
        </button>
        <button
          type="button"
          onClick={() => {
            setGraph((g) => clearDemoUnits(g));
            setSelectedIds([]);
          }}
          className="min-h-10 rounded-lg border border-zinc-800 px-3 text-xs font-medium text-zinc-500"
        >
          Clear demo
        </button>
        <p className="flex items-center text-[11px] text-zinc-600">
          {visibleUnits.length}/{graph.units.length} visible · {graph.relations.length} rel ·{" "}
          {graph.groups.length} groups
        </p>
      </div>

      {/* Compact filters — visibility only */}
      <div
        className="flex flex-wrap gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-2"
        aria-label="Filters"
      >
        <select
          className="min-h-10 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200"
          value={filters.unitType}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              unitType: e.target.value as ArgusUnitType | "all",
            }))
          }
          aria-label="Filter by type"
        >
          <option value="all">Type: all</option>
          {ARGUS_UNIT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="min-h-10 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200"
          value={filters.source}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              source: e.target.value as ArgusGraphFilters["source"],
            }))
          }
          aria-label="Filter by source"
        >
          <option value="all">Source: all</option>
          <option value="chaos">Chaos</option>
          <option value="demo">Demo</option>
        </select>
        <select
          className="min-h-10 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200"
          value={filters.chaosDeckId}
          onChange={(e) => setFilters((f) => ({ ...f, chaosDeckId: e.target.value }))}
          aria-label="Filter by Chaos Deck"
        >
          <option value="all">Deck: all</option>
          {deckOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
        <select
          className="min-h-10 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200"
          value={filters.groupId}
          onChange={(e) => setFilters((f) => ({ ...f, groupId: e.target.value }))}
          aria-label="Filter by group"
        >
          <option value="all">Group: all</option>
          {graph.groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
        <select
          className="min-h-10 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200"
          value={filters.relationPresence}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              relationPresence: e.target.value as ArgusGraphFilters["relationPresence"],
            }))
          }
          aria-label="Filter by relation presence"
        >
          <option value="all">Relations: all</option>
          <option value="with">With relations</option>
          <option value="without">Without relations</option>
        </select>
        <button
          type="button"
          className="min-h-10 rounded-lg border border-zinc-800 px-3 text-xs text-zinc-400"
          onClick={() => setFilters(DEFAULT_FILTERS)}
        >
          Clear filters
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
        <div className="h-[min(58vh,440px)] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            onPaneClick={() => setSelectedIds([])}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            selectionOnDrag
            multiSelectionKeyCode={["Meta", "Control", "Shift"]}
            fitView
            proOptions={{ hideAttribution: true }}
            className="bg-zinc-950"
          >
            <Background gap={18} color="#27272a" />
            <Controls className="!border-zinc-700 !bg-zinc-900 !fill-zinc-300" />
            <MiniMap
              className="!border-zinc-700 !bg-zinc-900"
              nodeColor="#3f3f46"
              maskColor="rgba(9,9,11,0.7)"
            />
          </ReactFlow>
        </div>

        <ArgusSelectionPanel
          selectedIds={selectedIds.filter((id) => !id.startsWith("grp_"))}
          unit={singleUnit}
          relations={graph.relations}
          unitsById={unitsById}
          groups={graph.groups}
          onClearSelection={() => setSelectedIds([])}
          onRemoveRelation={(id) => setGraph((g) => removeRelation(g, id))}
          onSetUnitType={(id, t) => setGraph((g) => setUnitType(g, id, t))}
          onSetRelationType={(id, t) =>
            setGraph((g) => setRelationType(g, id, t as ArgusRelationType))
          }
          onCreateGroup={() => {
            setGraph((g) => createGroupFromMembers(g, selectedIds));
            setSelectedIds([]);
          }}
          onRenameGroup={(id, label) => setGraph((g) => renameGroup(g, id, label))}
          onToggleCollapse={(id) =>
            setGraph((g) => {
              const grp = g.groups.find((x) => x.id === id);
              return grp ? setGroupCollapsed(g, id, !grp.collapsed) : g;
            })
          }
          onRemoveGroup={(id) => setGraph((g) => removeGroup(g, id))}
        />
      </div>
    </div>
  );
}

export function ArgusGraphView() {
  return (
    <ReactFlowProvider>
      <ArgusGraphCanvas />
    </ReactFlowProvider>
  );
}
