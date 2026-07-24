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
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { emptyOrSeedRepo, moveFragmentToDeck } from "@/lib/argusforge/af03-repo-store";
import {
  addRelation,
  addTagToUnit,
  addTagToUnits,
  allTags,
  bootstrapArgusGraph,
  clearDemoUnits,
  collapsedHiddenUnitIds,
  confirmRecurrence,
  createGroupFromMembers,
  dismissRecurrence,
  downloadTextFile,
  ensureDemoUnits,
  exportJsonString,
  exportMarkdownString,
  filterUnits,
  groupCentroid,
  removeGroup,
  removeRelation,
  removeTagFromUnit,
  renameGroup,
  scanRecurrence,
  setEvidenceType,
  setGroupCollapsed,
  setRelationConfirmed,
  setRelationType,
  setUnitConfirmed,
  syncUnitsFromChaos,
  updateUnitPosition,
} from "@/lib/argusforge/argus-graph-store";
import {
  ARGUS_EVIDENCE_TYPES,
  ARGUS_UNIT_TYPES,
  type ArgusEvidenceType,
  type ArgusGraphFilters,
  type ArgusGraphState,
  type ArgusRelationType,
  type ArgusUnit,
  type ArgusUnitType,
} from "@/lib/argusforge/argus-graph-types";
import { ArgusGroupNode, type ArgusGroupNodeData } from "./ArgusGroupNode";
import { ArgusSelectionPanel } from "./ArgusSelectionPanel";
import { ArgusUnitNode, type ArgusNodeData } from "./ArgusUnitNode";

const ArgusGraph3DView = dynamic(
  () => import("./ArgusGraph3DView").then((mod) => mod.ArgusGraph3DView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[280px] items-center justify-center bg-zinc-950 text-sm text-zinc-500">
        Loading 3D…
      </div>
    ),
  }
);

const nodeTypes = { argusUnit: ArgusUnitNode, argusGroup: ArgusGroupNode };

const DEFAULT_FILTERS: ArgusGraphFilters = {
  unitType: "all",
  evidenceType: "all",
  source: "all",
  chaosDeckId: "all",
  groupId: "all",
  tag: "all",
  relationPresence: "all",
};

type GraphViewMode = "2d" | "3d";

function ArgusGraphCanvas() {
  const [graph, setGraph] = useState<ArgusGraphState>(() => ({
    version: 3,
    units: [],
    relations: [],
    groups: [],
    recurrence: [],
    updatedAt: "",
  }));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<ArgusGraphFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<GraphViewMode>("2d");
  const [ready, setReady] = useState(false);
  const [repoEpoch, setRepoEpoch] = useState(0);
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
  }, [graph.units, repoEpoch]);

  const chaosRepo = useMemo(() => {
    if (typeof window === "undefined") return null;
    return emptyOrSeedRepo();
  }, [ready, viewMode, repoEpoch, graph.updatedAt]);

  const deckMoveTargets = useMemo(() => {
    if (typeof window === "undefined") return [] as Array<{ id: string; label: string }>;
    const repo = emptyOrSeedRepo();
    return [...repo.decks]
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((d) => ({
        id: d.id,
        label: d.view === "archive" ? `${d.title} (archive)` : d.title,
      }));
  }, [repoEpoch, ready, graph.updatedAt]);

  const tags = useMemo(() => allTags(graph), [graph]);
  const filteredUnits = useMemo(() => filterUnits(graph, filters), [graph, filters]);
  const hiddenCollapsed = useMemo(() => collapsedHiddenUnitIds(graph), [graph]);
  const visibleUnits = useMemo(
    () => filteredUnits.filter((u) => !hiddenCollapsed.has(u.id)),
    [filteredUnits, hiddenCollapsed]
  );
  const visibleIds = useMemo(() => new Set(visibleUnits.map((u) => u.id)), [visibleUnits]);

  useEffect(() => {
    setSelectedIds((ids) => {
      const next = ids.filter((id) => visibleIds.has(id));
      return next.length === ids.length ? ids : next;
    });
  }, [visibleIds]);

  useEffect(() => {
    if (!ready || viewMode !== "2d") return;
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
    setEdges(
      graph.relations
        .filter((r) => visibleIds.has(r.sourceUnitId) && visibleIds.has(r.targetUnitId))
        .map((r) => ({
          id: r.id,
          source: r.sourceUnitId,
          target: r.targetUnitId,
          label: r.confirmed ? r.type : `${r.type}?`,
          style: { stroke: r.confirmed ? "#71717a" : "#52525b" },
          labelStyle: { fill: "#a1a1aa", fontSize: 10 },
          labelBgStyle: { fill: "#09090b" },
          labelBgPadding: [4, 2] as [number, number],
        }))
    );
  }, [graph, visibleUnits, visibleIds, selectedIds, ready, viewMode, setNodes, setEdges]);

  const unitsById = useMemo(() => new Map(graph.units.map((u) => [u.id, u])), [graph.units]);
  const singleUnit: ArgusUnit | null =
    selectedIds.length === 1 ? unitsById.get(selectedIds[0]!) ?? null : null;
  const selectedId3d = selectedIds[0] ?? null;

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    if (connection.source.startsWith("grp_") || connection.target.startsWith("grp_")) return;
    setGraph((g) => addRelation(g, connection.source!, connection.target!, "related_to", true));
  }, []);

  const onNodeDragStop: OnNodeDrag = useCallback((_e, node) => {
    if (node.type === "argusGroup") return;
    setGraph((g) => updateUnitPosition(g, node.id, node.position));
  }, []);

  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    setSelectedIds(params.nodes.filter((n) => n.type === "argusUnit").map((n) => n.id));
  }, []);

  function exportGraph(format: "json" | "md", ids?: string[] | null) {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    if (format === "json") {
      downloadTextFile(
        `argus-export-${stamp}.json`,
        exportJsonString(graph, ids),
        "application/json"
      );
    } else {
      downloadTextFile(
        `argus-export-${stamp}.md`,
        exportMarkdownString(graph, ids),
        "text/markdown"
      );
    }
  }

  function handleMoveFragmentToDeck(chaosItemId: string, targetDeckId: string) {
    const nextRepo = moveFragmentToDeck(emptyOrSeedRepo(), chaosItemId, targetDeckId);
    setRepoEpoch((n) => n + 1);
    setGraph((g) => syncUnitsFromChaos(g, nextRepo));
  }

  if (!ready) return <p className="text-sm text-zinc-500">Loading Argus…</p>;

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-zinc-50">Argus</h2>
          <p className="text-xs text-zinc-500">
            Evidence · tags · relations. Select a Chaos unit →{" "}
            <span className="text-zinc-400">Move fragment to deck</span>. Chaos owns source.
          </p>
        </div>
        <div
          className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950/80 p-1"
          role="group"
          aria-label="Graph view mode"
        >
          <span className="px-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            View
          </span>
          <button
            type="button"
            onClick={() => setViewMode("2d")}
            className={`min-h-10 min-w-10 rounded-lg px-3 text-xs font-semibold transition ${
              viewMode === "2d"
                ? "bg-zinc-800 text-zinc-50"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            aria-pressed={viewMode === "2d"}
          >
            2D
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("3d");
              setSelectedIds((ids) => (ids.length > 1 ? [ids[0]!] : ids));
            }}
            className={`min-h-10 min-w-10 rounded-lg px-3 text-xs font-semibold transition ${
              viewMode === "3d"
                ? "bg-zinc-800 text-zinc-50"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            aria-pressed={viewMode === "3d"}
          >
            3D
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setGraph((g) => syncUnitsFromChaos(g))}
          className="min-h-10 rounded-lg border border-zinc-700 px-3 text-xs font-medium text-zinc-200"
        >
          Sync from Chaos
        </button>
        <button
          type="button"
          onClick={() => setGraph((g) => scanRecurrence(g))}
          className="min-h-10 rounded-lg border border-zinc-700 px-3 text-xs font-medium text-zinc-200"
        >
          Scan recurrence
        </button>
        <button
          type="button"
          onClick={() => exportGraph("json")}
          className="min-h-10 rounded-lg border border-zinc-800 px-3 text-xs text-zinc-400"
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={() => exportGraph("md")}
          className="min-h-10 rounded-lg border border-zinc-800 px-3 text-xs text-zinc-400"
        >
          Export MD
        </button>
        <button
          type="button"
          onClick={() => setGraph((g) => ensureDemoUnits(g))}
          className="min-h-10 rounded-lg border border-zinc-800 px-3 text-xs text-zinc-500"
        >
          Fill demo
        </button>
        <button
          type="button"
          onClick={() => {
            setGraph((g) => clearDemoUnits(g));
            setSelectedIds([]);
          }}
          className="min-h-10 rounded-lg border border-zinc-800 px-3 text-xs text-zinc-600"
        >
          Clear demo
        </button>
        <p className="flex items-center text-[11px] text-zinc-600">
          {visibleUnits.length}/{graph.units.length} · {graph.relations.length} rel ·{" "}
          {graph.recurrence.filter((c) => c.status === "open").length} recurrence
        </p>
      </div>

      <div
        className="flex flex-wrap gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-2"
        aria-label="Filters"
      >
        <select
          className="min-h-10 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200"
          value={filters.evidenceType}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              evidenceType: e.target.value as ArgusEvidenceType | "all",
            }))
          }
        >
          <option value="all">Evidence: all</option>
          {ARGUS_EVIDENCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="min-h-10 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200"
          value={filters.tag}
          onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))}
        >
          <option value="all">Tag: all</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="min-h-10 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200"
          value={filters.unitType}
          onChange={(e) =>
            setFilters((f) => ({ ...f, unitType: e.target.value as ArgusUnitType | "all" }))
          }
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
        >
          <option value="all">Source: all</option>
          <option value="chaos">Chaos</option>
          <option value="demo">Demo</option>
        </select>
        <select
          className="min-h-10 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200"
          value={filters.chaosDeckId}
          onChange={(e) => setFilters((f) => ({ ...f, chaosDeckId: e.target.value }))}
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
        >
          <option value="all">Relations: all</option>
          <option value="with">With</option>
          <option value="without">Without</option>
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
        <div className="h-[min(58vh,440px)] min-h-[280px] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          {viewMode === "2d" ? (
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
          ) : (
            <ArgusGraph3DView
              units={visibleUnits}
              relations={graph.relations}
              repo={chaosRepo}
              selectedId={selectedId3d}
              onSelect={(id) => setSelectedIds(id ? [id] : [])}
            />
          )}
        </div>

        <ArgusSelectionPanel
          selectedIds={selectedIds}
          unit={singleUnit}
          relations={graph.relations}
          unitsById={unitsById}
          groups={graph.groups}
          recurrence={graph.recurrence}
          onClearSelection={() => setSelectedIds([])}
          onRemoveRelation={(id) => setGraph((g) => removeRelation(g, id))}
          onSetEvidenceType={(id, t) => setGraph((g) => setEvidenceType(g, id, t))}
          onSetRelationType={(id, t) =>
            setGraph((g) => setRelationType(g, id, t as ArgusRelationType))
          }
          onSetUnitConfirmed={(id, c) => setGraph((g) => setUnitConfirmed(g, id, c))}
          onSetRelationConfirmed={(id, c) => setGraph((g) => setRelationConfirmed(g, id, c))}
          onAddTag={(id, tag) => setGraph((g) => addTagToUnit(g, id, tag))}
          onRemoveTag={(id, tag) => setGraph((g) => removeTagFromUnit(g, id, tag))}
          onAddTagToSelection={(tag) => setGraph((g) => addTagToUnits(g, selectedIds, tag))}
          onCreateGroup={() => {
            setGraph((g) => createGroupFromMembers(g, selectedIds));
            setSelectedIds([]);
          }}
          onCreateRelationBetweenTwo={() => {
            if (selectedIds.length !== 2) return;
            setGraph((g) =>
              addRelation(g, selectedIds[0]!, selectedIds[1]!, "related_to", true)
            );
          }}
          onExportSelection={(fmt) => exportGraph(fmt, selectedIds)}
          onRenameGroup={(id, label) => setGraph((g) => renameGroup(g, id, label))}
          onToggleCollapse={(id) =>
            setGraph((g) => {
              const grp = g.groups.find((x) => x.id === id);
              return grp ? setGroupCollapsed(g, id, !grp.collapsed) : g;
            })
          }
          onRemoveGroup={(id) => setGraph((g) => removeGroup(g, id))}
          onConfirmRecurrence={(id) => setGraph((g) => confirmRecurrence(g, id))}
          onDismissRecurrence={(id) => setGraph((g) => dismissRecurrence(g, id))}
          deckMoveTargets={deckMoveTargets}
          onMoveFragmentToDeck={handleMoveFragmentToDeck}
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
