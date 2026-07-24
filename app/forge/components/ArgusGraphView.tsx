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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addRelation,
  bootstrapArgusGraph,
  clearDemoUnits,
  ensureDemoUnits,
  removeRelation,
  syncUnitsFromChaos,
  updateUnitPosition,
} from "@/lib/argusforge/argus-graph-store";
import type { ArgusGraphState, ArgusUnit } from "@/lib/argusforge/argus-graph-types";
import { ArgusSelectionPanel } from "./ArgusSelectionPanel";
import { ArgusUnitNode, type ArgusNodeData } from "./ArgusUnitNode";

const nodeTypes = { argusUnit: ArgusUnitNode };

function toNodes(units: ArgusUnit[], selectedId: string | null): Node<ArgusNodeData>[] {
  return units.map((unit) => ({
    id: unit.id,
    type: "argusUnit",
    position: unit.position,
    data: { unit, selected: unit.id === selectedId },
  }));
}

function toEdges(graph: ArgusGraphState): Edge[] {
  return graph.relations.map((r) => ({
    id: r.id,
    source: r.sourceUnitId,
    target: r.targetUnitId,
    label: r.type,
    style: { stroke: "#71717a" },
    labelStyle: { fill: "#a1a1aa", fontSize: 10 },
  }));
}

function ArgusGraphCanvas() {
  const [graph, setGraph] = useState<ArgusGraphState>(() => ({
    version: 1,
    units: [],
    relations: [],
    updatedAt: "",
  }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ArgusNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const g = bootstrapArgusGraph();
    setGraph(g);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    setNodes(toNodes(graph.units, selectedId));
    setEdges(toEdges(graph));
  }, [graph, selectedId, ready, setNodes, setEdges]);

  const unitsById = useMemo(() => new Map(graph.units.map((u) => [u.id, u])), [graph.units]);
  const selected = selectedId ? unitsById.get(selectedId) ?? null : null;

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    setGraph((g) => addRelation(g, connection.source!, connection.target!));
  }, []);

  const onNodeDragStop: OnNodeDrag = useCallback((_e, node) => {
    setGraph((g) => updateUnitPosition(g, node.id, node.position));
  }, []);

  function handleSync() {
    setGraph((g) => syncUnitsFromChaos(g));
    setSelectedId(null);
  }

  function handleDemo() {
    setGraph((g) => ensureDemoUnits(g));
  }

  function handleClearDemo() {
    setGraph((g) => clearDemoUnits(g));
    setSelectedId(null);
  }

  if (!ready) {
    return <p className="text-sm text-zinc-500">Loading Argus graph…</p>;
  }

  return (
    <div className="space-y-3">
      <header className="space-y-1">
        <h2 className="text-xl font-bold text-zinc-50">Argus</h2>
        <p className="text-xs leading-relaxed text-zinc-500">
          Prototype — identifiable unit · visible relation · operable selection. Chaos owns content;
          this graph relates. Not definitive Engine schema. No AI.
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
          onClick={handleDemo}
          className="min-h-10 rounded-lg border border-zinc-800 px-3 text-xs font-medium text-zinc-400"
        >
          Fill demo units
        </button>
        <button
          type="button"
          onClick={handleClearDemo}
          className="min-h-10 rounded-lg border border-zinc-800 px-3 text-xs font-medium text-zinc-500"
        >
          Clear demo
        </button>
        <p className="flex items-center text-[11px] text-zinc-600">
          {graph.units.length} units · {graph.relations.length} links
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <div className="h-[min(60vh,420px)] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_e, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            className="bg-zinc-950"
          >
            <Background gap={18} color="#27272a" />
            <Controls className="!bg-zinc-900 !border-zinc-700 !fill-zinc-300" />
            <MiniMap
              className="!bg-zinc-900 !border-zinc-700"
              nodeColor="#3f3f46"
              maskColor="rgba(9,9,11,0.7)"
            />
          </ReactFlow>
        </div>

        <ArgusSelectionPanel
          unit={selected}
          relations={graph.relations}
          unitsById={unitsById}
          onClearSelection={() => setSelectedId(null)}
          onRemoveRelation={(id) => setGraph((g) => removeRelation(g, id))}
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
