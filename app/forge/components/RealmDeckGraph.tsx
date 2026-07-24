"use client";

/**
 * CHANGE 24-0F — Realm graph: Chaos Deck nodes (React Flow).
 */

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type OnNodeDrag,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deckClusterKey,
  deckLinksForRealm,
  deckMetrics,
  getRealmTitle,
  isUnassignedRealm,
  listDecksForRealm,
  type DeckNodeMetrics,
} from "@/lib/argusforge/af03-realm-map";
import {
  emptyOrSeedRepo,
  formatRelativeAgo,
  recordRealmOpen,
} from "@/lib/argusforge/af03-repo-store";
import type { Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import { readArgusGraph } from "@/lib/argusforge/argus-graph-store";
import type { ArgusGraphState } from "@/lib/argusforge/argus-graph-types";
import { Af03RepoDisclosure } from "./Af03RepoDisclosure";
import { RealmDeckNode, type RealmDeckNodeData } from "./RealmDeckNode";

const nodeTypes = { realmDeck: RealmDeckNode };

const LAYOUT_KEY = "argusforge-realm-deck-layout-v1";

type LayoutMap = Record<string, Record<string, { x: number; y: number }>>;

function readLayout(): LayoutMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    return raw ? (JSON.parse(raw) as LayoutMap) : {};
  } catch {
    return {};
  }
}

function writeLayout(map: LayoutMap) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

function defaultPosition(
  index: number,
  clusterIndex: number,
  withinCluster: number
): { x: number; y: number } {
  return {
    x: 40 + clusterIndex * 280 + (withinCluster % 2) * 40,
    y: 40 + withinCluster * 130 + (index % 3) * 8,
  };
}

function RealmGraphCanvas({ realmId }: { realmId: string }) {
  const router = useRouter();
  const [state, setState] = useState<Af03RepoState | null>(null);
  const [graph, setGraph] = useState<ArgusGraphState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    let repo = emptyOrSeedRepo();
    repo = recordRealmOpen(repo, realmId);
    setState(repo);
    setGraph(readArgusGraph());
    setReady(true);
  }, [realmId]);

  const decks = useMemo(
    () => (state ? listDecksForRealm(state, realmId) : []),
    [state, realmId]
  );

  const title = state ? getRealmTitle(state, realmId) : "Realm";
  const realmExists =
    isUnassignedRealm(realmId) || Boolean(state?.folders.some((f) => f.id === realmId));

  const metricsByDeck = useMemo(() => {
    const map = new Map<string, DeckNodeMetrics>();
    if (!state) return map;
    for (const d of decks) {
      map.set(d.id, deckMetrics(d, state, graph));
    }
    return map;
  }, [state, decks, graph]);

  const links = useMemo(
    () => (state ? deckLinksForRealm(state, realmId, graph) : []),
    [state, realmId, graph]
  );

  const selectedDeck = decks.find((d) => d.id === selectedId) ?? null;
  const selectedMetrics = selectedId ? metricsByDeck.get(selectedId) ?? null : null;

  useEffect(() => {
    if (!ready || !state) return;
    const layout = readLayout()[realmId] ?? {};
    const clusters = new Map<string, typeof decks>();
    for (const d of decks) {
      const { clusterId } = deckClusterKey(state, realmId, d);
      const list = clusters.get(clusterId) ?? [];
      list.push(d);
      clusters.set(clusterId, list);
    }
    const clusterIds = [...clusters.keys()];
    const nextNodes: Node<RealmDeckNodeData>[] = [];
    let globalIndex = 0;
    clusterIds.forEach((cid, clusterIndex) => {
      const group = clusters.get(cid)!;
      group.forEach((deck, within) => {
        const { label } = deckClusterKey(state, realmId, deck);
        const metrics = metricsByDeck.get(deck.id)!;
        const pos = layout[deck.id] ?? defaultPosition(globalIndex, clusterIndex, within);
        nextNodes.push({
          id: deck.id,
          type: "realmDeck",
          position: pos,
          data: {
            title: deck.title,
            metrics,
            selected: selectedId === deck.id,
            clusterLabel: label,
            reduceMotion,
          },
          selected: selectedId === deck.id,
        });
        globalIndex += 1;
      });
    });
    setNodes(nextNodes);
    setEdges(
      links.map((l) => ({
        id: l.id,
        source: l.sourceDeckId,
        target: l.targetDeckId,
        label: l.confirmed ? l.type : `${l.type}?`,
        style: { stroke: l.confirmed ? "#a1a1aa" : "#52525b" },
        labelStyle: { fill: "#a1a1aa", fontSize: 10 },
        labelBgStyle: { fill: "#09090b" },
        labelBgPadding: [4, 2] as [number, number],
      }))
    );
  }, [
    ready,
    state,
    decks,
    metricsByDeck,
    links,
    realmId,
    selectedId,
    reduceMotion,
    setNodes,
    setEdges,
  ]);

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_e, node) => {
      const all = readLayout();
      const realmLayout = { ...(all[realmId] ?? {}), [node.id]: node.position };
      writeLayout({ ...all, [realmId]: realmLayout });
    },
    [realmId]
  );

  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const id = params.nodes[0]?.id ?? null;
    setSelectedId(id);
  }, []);

  if (!ready || !state) {
    return <p className="text-sm text-zinc-500">Loading Realm…</p>;
  }

  if (!realmExists) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-rose-300">
          Realm not found.
        </p>
        <Link href="/forge" className="text-sm text-zinc-300 underline">
          Back to Home MapTree
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] flex-col gap-3">
      <Af03RepoDisclosure />

      <header className="flex shrink-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-500/90">
            Realm
          </p>
          <h2 className="truncate text-lg font-semibold text-zinc-100">{title}</h2>
          <p className="text-xs text-zinc-500">
            Chaos Deck graph — nodes are decks, not fragments. Drag to arrange.
          </p>
        </div>
        <Link
          href="/forge"
          className="min-h-11 rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600"
        >
          ← MapTree
        </Link>
      </header>

      {decks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 px-4 py-16 text-center">
          <p className="text-sm text-zinc-400">Empty Realm — no Chaos Decks here yet.</p>
          <p className="text-xs text-zinc-600">Use + to create a Chaos Deck, then return here.</p>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="h-[min(70dvh,560px)] min-h-[320px] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 lg:h-auto lg:min-h-[420px]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeDragStop={onNodeDragStop}
              onSelectionChange={onSelectionChange}
              nodeTypes={nodeTypes}
              fitView
              proOptions={{ hideAttribution: true }}
              className="bg-zinc-950"
            >
              <Background gap={18} color="#27272a" />
              <Controls showInteractive={false} />
              <MiniMap
                nodeColor="#3f3f46"
                maskColor="rgba(9,9,11,0.7)"
                className="!bg-zinc-900"
              />
            </ReactFlow>
          </div>

          <aside className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm">
            {selectedDeck && selectedMetrics ? (
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">Chaos Deck</p>
                  <p className="font-semibold text-zinc-100">{selectedDeck.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Source Realm: {title}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-zinc-600">Fragments</dt>
                    <dd className="font-medium text-zinc-200">{selectedMetrics.fragmentCount}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-600">Relations</dt>
                    <dd className="font-medium text-zinc-200">{selectedMetrics.relationCount}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-600">Opens</dt>
                    <dd className="font-medium text-zinc-200">{selectedMetrics.openCount}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-600">Activity</dt>
                    <dd className="font-medium text-zinc-200">
                      {selectedMetrics.lastActivityAt
                        ? formatRelativeAgo(selectedMetrics.lastActivityAt)
                        : "—"}
                    </dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="min-h-11 w-full rounded-lg border border-zinc-600 bg-zinc-100 text-sm font-semibold text-zinc-900"
                  onClick={() => router.push(`/forge/deck/${selectedDeck.id}`)}
                >
                  Open Chaos Deck
                </button>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">
                Select a Chaos Deck node for details. Size ≈ mass; color ≈ freshness
                (provisional).
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

export function RealmDeckGraph({ realmId }: { realmId: string }) {
  return (
    <ReactFlowProvider>
      <RealmGraphCanvas realmId={realmId} />
    </ReactFlowProvider>
  );
}
