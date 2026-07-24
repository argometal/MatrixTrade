"use client";

/**
 * CHANGE 24-17 — Realm molecular graph: Chaos Deck bodies (React Flow).
 */

import {
  Background,
  Controls,
  MarkerType,
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
  molecularDefaultPosition,
  structuralAffinitiesForRealm,
  type DeckNodeMetrics,
} from "@/lib/argusforge/af03-realm-map";
import {
  emptyOrSeedRepo,
  formatRelativeAgo,
  moveDeckToFolder,
  recordRealmOpen,
} from "@/lib/argusforge/af03-repo-store";
import type { Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import { UNASSIGNED_REALM_ID } from "@/lib/argusforge/af03-repo-types";
import { readArgusGraph } from "@/lib/argusforge/argus-graph-store";
import type { ArgusGraphState } from "@/lib/argusforge/argus-graph-types";
import { readMolecularOverlay } from "@/lib/argusforge/af03-realm-molecular";
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

function MolecularLegend({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/90 text-[10px] text-zinc-400">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-9 w-full items-center justify-between px-2.5 font-medium text-zinc-300"
        aria-expanded={open}
      >
        Legend
        <span>{open ? "▾" : "▸"}</span>
      </button>
      {open ? (
        <ul className="space-y-1 border-t border-zinc-800 px-2.5 py-2">
          <li>Size = importance / mass</li>
          <li>Color = recent use</li>
          <li>Pulse = current activity</li>
          <li>Solid link = confirmed relation</li>
          <li>Dashed link = suggested relation</li>
          <li>Orbit / halo = detected affinity</li>
        </ul>
      ) : null}
    </div>
  );
}

function RealmGraphCanvas({ realmId }: { realmId: string }) {
  const router = useRouter();
  const [state, setState] = useState<Af03RepoState | null>(null);
  const [graph, setGraph] = useState<ArgusGraphState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
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
    readMolecularOverlay();
    setReady(true);
  }, [realmId]);

  const decks = useMemo(
    () => (state ? listDecksForRealm(state, realmId) : []),
    [state, realmId]
  );

  const affinities = useMemo(
    () => (state ? structuralAffinitiesForRealm(state, realmId) : []),
    [state, realmId]
  );

  const title = state ? getRealmTitle(state, realmId) : "Realm";
  const realmExists =
    isUnassignedRealm(realmId) || Boolean(state?.folders.some((f) => f.id === realmId));

  const metricsByDeck = useMemo(() => {
    const map = new Map<string, DeckNodeMetrics>();
    if (!state) return map;
    for (const d of decks) {
      map.set(d.id, deckMetrics(d, state, graph, affinities));
    }
    return map;
  }, [state, decks, graph, affinities]);

  const links = useMemo(
    () => (state ? deckLinksForRealm(state, realmId, graph) : []),
    [state, realmId, graph]
  );

  const selectedDeck = decks.find((d) => d.id === selectedId) ?? null;
  const selectedMetrics = selectedId ? metricsByDeck.get(selectedId) ?? null : null;

  const realmMoveTargets = useMemo(() => {
    if (!state) return [] as Array<{ id: string | null; label: string; view: string }>;
    const folders = [...state.folders].sort((a, b) => a.title.localeCompare(b.title));
    return [
      { id: null as string | null, label: "Unassigned", view: "active" },
      ...folders.map((f) => ({
        id: f.id as string | null,
        label: `${f.title}${f.view === "archive" ? " (archive)" : ""}`,
        view: f.view,
      })),
    ];
  }, [state]);

  function handleMoveDeck(targetFolderId: string) {
    if (!selectedDeck) return;
    const folderId =
      targetFolderId === UNASSIGNED_REALM_ID || targetFolderId === ""
        ? null
        : targetFolderId;
    const staysInRealm =
      (isUnassignedRealm(realmId) && folderId === null) || folderId === realmId;
    setState((prev) => {
      const base = prev ?? emptyOrSeedRepo();
      return moveDeckToFolder(base, selectedDeck.id, folderId);
    });
    if (!staysInRealm) setSelectedId(null);
  }

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
    clusterIds.forEach((cid, clusterIndex) => {
      const group = clusters.get(cid)!;
      group.forEach((deck, within) => {
        const { label } = deckClusterKey(state, realmId, deck);
        const metrics = metricsByDeck.get(deck.id)!;
        const pos =
          layout[deck.id] ?? molecularDefaultPosition(clusterIndex, within, metrics.affinityCount);
        nextNodes.push({
          id: deck.id,
          type: "realmDeck",
          position: pos,
          data: {
            title: deck.title,
            metrics,
            selected: selectedId === deck.id,
            clusterLabel: label,
            hasAffinityHalo: metrics.affinityCount > 0,
            reduceMotion,
          },
          selected: selectedId === deck.id,
        });
      });
    });
    setNodes(nextNodes);
    setEdges(
      links.map((l) => {
        const confirmed = l.confirmationState === "confirmed";
        const width = 1 + l.relationStrength * 0.55;
        return {
          id: l.id,
          source: l.sourceDeckId,
          target: l.targetDeckId,
          label: confirmed ? l.type : `${l.type}?`,
          animated: false,
          style: {
            stroke: confirmed ? "#a1a1aa" : "#71717a",
            strokeWidth: width,
            strokeDasharray: confirmed ? undefined : "5 4",
          },
          labelStyle: { fill: "#a1a1aa", fontSize: 10 },
          labelBgStyle: { fill: "#09090b" },
          labelBgPadding: [4, 2] as [number, number],
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color: confirmed ? "#a1a1aa" : "#71717a",
          },
        };
      })
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
    setSelectedId(params.nodes[0]?.id ?? null);
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
        <Link href="/forge/argus" className="text-sm text-zinc-300 underline">
          Back to Argus Treemap
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
            Argus · Molecular
          </p>
          <h2 className="truncate text-lg font-semibold text-zinc-100">{title}</h2>
          <p className="text-xs text-zinc-500">
            Chaos Deck bodies — Fragments stay inside. Halo ≠ confirmed link.
          </p>
        </div>
        <Link
          href="/forge/argus"
          className="min-h-11 rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600"
        >
          ← Treemap
        </Link>
      </header>

      {decks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 px-4 py-16 text-center">
          <p className="text-sm text-zinc-400">Empty Realm — no Chaos Decks here yet.</p>
          <p className="text-xs text-zinc-600">Use + to create a Chaos Deck, then return here.</p>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_15.5rem]">
          <div className="relative h-[min(70dvh,560px)] min-h-[320px] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 lg:h-auto lg:min-h-[420px]">
            <div className="absolute left-2 top-2 z-10 w-40">
              <MolecularLegend open={legendOpen} onToggle={() => setLegendOpen((v) => !v)} />
            </div>
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
                  <p className="mt-1 text-xs text-zinc-500">Realm: {title}</p>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-zinc-600">Fragments</dt>
                    <dd className="font-medium text-zinc-200">{selectedMetrics.fragmentCount}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-600">Mass</dt>
                    <dd className="font-medium text-zinc-200">
                      {selectedMetrics.massScore.toFixed(2)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-600">Relations</dt>
                    <dd className="font-medium text-zinc-200">{selectedMetrics.relationCount}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-600">Affinity</dt>
                    <dd className="font-medium text-zinc-200">{selectedMetrics.affinityCount}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-600">Activity</dt>
                    <dd className="font-medium capitalize text-zinc-200">
                      {selectedMetrics.activityLevel}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-600">Last used</dt>
                    <dd className="font-medium text-zinc-200">
                      {selectedMetrics.lastUsedAt
                        ? formatRelativeAgo(selectedMetrics.lastUsedAt)
                        : "—"}
                    </dd>
                  </div>
                </dl>
                {selectedMetrics.affinityReason ? (
                  <p className="text-[10px] leading-relaxed text-zinc-500">
                    Affinity: {selectedMetrics.affinityReason}
                  </p>
                ) : null}
                <label className="block space-y-1">
                  <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Move to Realm
                  </span>
                  <select
                    className="min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-200"
                    defaultValue=""
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value) return;
                      handleMoveDeck(value);
                      e.target.value = "";
                    }}
                  >
                    <option value="">Choose realm…</option>
                    {realmMoveTargets.map((target) => (
                      <option
                        key={target.id ?? "unassigned"}
                        value={target.id ?? "unassigned"}
                        disabled={
                          (target.id === null && isUnassignedRealm(realmId)) ||
                          target.id === realmId
                        }
                      >
                        {target.label}
                      </option>
                    ))}
                  </select>
                </label>
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
                Select a Chaos Deck. Size = mass; color = use; halo = affinity placeholder.
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
