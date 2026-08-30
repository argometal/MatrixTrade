"use client";

/**
 * CHANGE 24-27 — Realm molecular graph: mobile-first relational workspace.
 * React Flow preserved; no new engines / force physics / 3D.
 */

import {
  Background,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type OnNodeDrag,
  type OnSelectionChangeParams,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  deckClusterKey,
  deckLinksForRealm,
  deckMetrics,
  formatUsedLabel,
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
import type { Af03ChaosDeck, Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import { UNASSIGNED_REALM_ID } from "@/lib/argusforge/af03-repo-types";
import { readArgusGraph } from "@/lib/argusforge/argus-graph-store";
import type { ArgusGraphState } from "@/lib/argusforge/argus-graph-types";
import { readMolecularOverlay } from "@/lib/argusforge/af03-realm-molecular";
import { Af03RepoDisclosure } from "./Af03RepoDisclosure";
import {
  ForgeExpandableSurface,
  ForgeExpandIcon,
} from "./ForgeExpandableSurface";
import { ForgeOverflowMenu } from "./ForgeOverflowMenu";
import { RealmDeckNode, type RealmDeckNodeData } from "./RealmDeckNode";

const nodeTypes = { realmDeck: RealmDeckNode };
const LAYOUT_KEY = "argusforge-realm-deck-layout-v1";
const PREFS_KEY = "argusforge-realm-graph-prefs-v1";

type LayoutMap = Record<string, Record<string, { x: number; y: number }>>;
type ViewMode = "graph" | "list";
type SheetTab = "controls" | "filters" | "legend";
type ExploreMode = "explore" | "focus";

type GraphPrefs = {
  exploreMode: ExploreMode;
  minRelationStrength: number;
  relationFilter: "all" | "confirmed" | "suggested";
};

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

function readPrefs(): GraphPrefs {
  if (typeof window === "undefined") {
    return { exploreMode: "explore", minRelationStrength: 0, relationFilter: "all" };
  }
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) {
      return { exploreMode: "explore", minRelationStrength: 0, relationFilter: "all" };
    }
    const parsed = JSON.parse(raw) as Partial<GraphPrefs>;
    return {
      exploreMode: parsed.exploreMode === "focus" ? "focus" : "explore",
      minRelationStrength:
        typeof parsed.minRelationStrength === "number"
          ? Math.max(0, Math.min(1, parsed.minRelationStrength))
          : 0,
      relationFilter:
        parsed.relationFilter === "confirmed" || parsed.relationFilter === "suggested"
          ? parsed.relationFilter
          : "all",
    };
  } catch {
    return { exploreMode: "explore", minRelationStrength: 0, relationFilter: "all" };
  }
}

function writePrefs(prefs: GraphPrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* quota */
  }
}

function FloatBtn({
  label,
  onClick,
  children,
  active,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center rounded-xl border text-zinc-200 shadow-lg backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
        active
          ? "border-emerald-500/60 bg-emerald-950/80 text-emerald-100"
          : "border-zinc-700/90 bg-zinc-950/85 hover:border-zinc-500"
      }`}
    >
      {children}
    </button>
  );
}

function RealmGraphCanvas({ realmId }: { realmId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectDeckId = searchParams.get("deck");
  const { fitView } = useReactFlow();

  const [state, setState] = useState<Af03RepoState | null>(null);
  const [graph, setGraph] = useState<ArgusGraphState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(preselectDeckId);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [view, setView] = useState<ViewMode>("graph");
  const [expanded, setExpanded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<SheetTab>("controls");
  const [minimapOpen, setMinimapOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [prefs, setPrefs] = useState<GraphPrefs>({
    exploreMode: "explore",
    minRelationStrength: 0,
    relationFilter: "all",
  });
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
    setPrefs(readPrefs());
    setReady(true);
  }, [realmId]);

  useEffect(() => {
    if (preselectDeckId) setSelectedId(preselectDeckId);
  }, [preselectDeckId, realmId]);

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

  const visibleLinks = useMemo(() => {
    return links.filter((l) => {
      if (l.relationStrength < prefs.minRelationStrength) return false;
      if (prefs.relationFilter === "confirmed" && l.confirmationState !== "confirmed") {
        return false;
      }
      if (prefs.relationFilter === "suggested" && l.confirmationState === "confirmed") {
        return false;
      }
      return true;
    });
  }, [links, prefs.minRelationStrength, prefs.relationFilter]);

  const neighborIds = useMemo(() => {
    if (!selectedId || prefs.exploreMode !== "focus") return null;
    const set = new Set<string>([selectedId]);
    for (const l of visibleLinks) {
      if (l.sourceDeckId === selectedId) set.add(l.targetDeckId);
      if (l.targetDeckId === selectedId) set.add(l.sourceDeckId);
    }
    return set;
  }, [selectedId, prefs.exploreMode, visibleLinks]);

  const selectedDeck = decks.find((d) => d.id === selectedId) ?? null;
  const selectedMetrics = selectedId ? metricsByDeck.get(selectedId) ?? null : null;

  const totalFragments = useMemo(
    () => decks.reduce((n, d) => n + (metricsByDeck.get(d.id)?.fragmentCount ?? 0), 0),
    [decks, metricsByDeck]
  );

  const realmMoveTargets = useMemo(() => {
    if (!state) return [] as Array<{ id: string | null; label: string }>;
    const folders = [...state.folders].sort((a, b) => a.title.localeCompare(b.title));
    return [
      { id: null as string | null, label: "Unassigned" },
      ...folders.map((f) => ({
        id: f.id as string | null,
        label: `${f.title}${f.view === "archive" ? " (archive)" : ""}`,
      })),
    ];
  }, [state]);

  function patchPrefs(partial: Partial<GraphPrefs>) {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      writePrefs(next);
      return next;
    });
  }

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
    const q = searchQuery.trim().toLowerCase();
    const clusters = new Map<string, Af03ChaosDeck[]>();
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
        const metrics = metricsByDeck.get(deck.id)!;
        let pos = layout[deck.id];
        if (!pos) {
          if (decks.length === 1) {
            pos = { x: 160, y: 140 };
          } else {
            pos = molecularDefaultPosition(
              clusterIndex,
              within,
              metrics.affinityCount
            );
          }
        }
        const searchMiss = q.length > 0 && !deck.title.toLowerCase().includes(q);
        const focusMiss = neighborIds !== null && !neighborIds.has(deck.id);
        nextNodes.push({
          id: deck.id,
          type: "realmDeck",
          position: pos,
          data: {
            title: deck.title,
            metrics,
            selected: selectedId === deck.id,
            dimmed: searchMiss || focusMiss,
            hasAffinityHalo: metrics.affinityCount > 0,
            reduceMotion,
          },
          selected: selectedId === deck.id,
        });
      });
    });
    setNodes(nextNodes);

    setEdges(
      visibleLinks.map((l) => {
        const confirmed = l.confirmationState === "confirmed";
        const width = 1.25 + l.relationStrength * 0.7;
        const focusMiss =
          neighborIds !== null &&
          !(neighborIds.has(l.sourceDeckId) && neighborIds.has(l.targetDeckId));
        return {
          id: l.id,
          source: l.sourceDeckId,
          target: l.targetDeckId,
          animated: false,
          style: {
            stroke: confirmed ? "#a78bfa" : "#7c3aed",
            strokeWidth: width,
            strokeDasharray: confirmed ? undefined : "5 4",
            opacity: focusMiss ? 0.12 : 0.9,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: confirmed ? "#a78bfa" : "#7c3aed",
          },
        };
      })
    );
  }, [
    ready,
    state,
    decks,
    metricsByDeck,
    visibleLinks,
    realmId,
    selectedId,
    reduceMotion,
    neighborIds,
    searchQuery,
    setNodes,
    setEdges,
  ]);

  useEffect(() => {
    if (!ready || view !== "graph" || decks.length === 0) return;
    const t = window.setTimeout(() => {
      fitView({ padding: decks.length === 1 ? 0.45 : 0.22, duration: reduceMotion ? 0 : 220 });
    }, 60);
    return () => window.clearTimeout(t);
  }, [ready, view, decks.length, realmId, fitView, reduceMotion, expanded]);

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

  const metaLine = `${decks.length} Chaos Deck${decks.length === 1 ? "" : "s"} · ${
    links.length
  } relation${links.length === 1 ? "" : "s"}`;

  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] flex-col gap-2">
      <header className="flex shrink-0 items-start gap-2">
        <Link
          href="/forge/argus"
          aria-label="Back to Argus Treemap"
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg text-zinc-300 hover:bg-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-zinc-100">{title}</h2>
          <p className="truncate text-[11px] text-zinc-500">{metaLine}</p>
          {totalFragments > 0 ? (
            <p className="truncate text-[10px] text-zinc-600">
              In this Realm · {totalFragments} Fragment{totalFragments === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
        <ForgeOverflowMenu
          open={menuOpen}
          onOpenChange={setMenuOpen}
          label="Realm graph menu"
          align="end"
          items={[
            {
              id: "treemap",
              label: "Open Treemap",
              onClick: () => router.push("/forge/argus"),
            },
            {
              id: "chaos",
              label: "Dump to Chaos (+)",
              onClick: () => router.push("/forge/chaos"),
            },
            {
              id: "fit",
              label: "Reset view",
              onClick: () =>
                fitView({
                  padding: decks.length === 1 ? 0.45 : 0.22,
                  duration: reduceMotion ? 0 : 220,
                }),
            },
          ]}
        />
      </header>

      <Af03RepoDisclosure compact />

      <div
        role="tablist"
        aria-label="Realm view"
        className="grid shrink-0 grid-cols-2 gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1"
      >
        {(
          [
            ["graph", "Graph"],
            ["list", "List"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`min-h-9 rounded-lg text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              view === id
                ? "bg-zinc-100 text-zinc-950"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {decks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 px-4 py-16 text-center">
          <p className="text-sm text-zinc-400">Empty Realm — no Chaos Decks here yet.</p>
          <Link
            href="/forge/chaos"
            className="flex min-h-11 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white"
          >
            Dump to Chaos (+)
          </Link>
        </div>
      ) : view === "list" ? (
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
          {decks.map((deck) => {
            const m = metricsByDeck.get(deck.id)!;
            return (
              <li key={deck.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(deck.id);
                    setView("graph");
                  }}
                  className="flex w-full min-h-14 items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2.5 text-left hover:border-zinc-600"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-100">
                      {deck.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
                      {m.fragmentCount} Fragment{m.fragmentCount === 1 ? "" : "s"} ·{" "}
                      {formatUsedLabel(m.lastUsedAt)}
                    </span>
                  </span>
                  <Link
                    href={`/forge/deck/${deck.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300"
                  >
                    Open
                  </Link>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="relative min-h-0 flex-1">
          <ForgeExpandableSurface
            className="relative h-[min(62dvh,640px)] min-h-[55dvh] overflow-hidden rounded-2xl border border-zinc-800 bg-black lg:h-[min(72dvh,720px)]"
            ariaLabel="Fullscreen Realm molecular graph"
            backTitle="Back to Realm"
            backSubtitle="Collapse graph"
            showExpandButton={false}
            expanded={expanded}
            onExpandedChange={setExpanded}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeDragStop={onNodeDragStop}
              onSelectionChange={onSelectionChange}
              onDoubleClick={(e) => {
                const el = e.target as HTMLElement | null;
                if (!el?.classList?.contains("react-flow__pane")) return;
                fitView({
                  padding: decks.length === 1 ? 0.45 : 0.22,
                  duration: reduceMotion ? 0 : 200,
                });
              }}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: decks.length === 1 ? 0.45 : 0.22 }}
              minZoom={0.25}
              maxZoom={1.75}
              proOptions={{ hideAttribution: true }}
              className="h-full bg-black"
              style={{ background: "#000" }}
            >
              <Background gap={22} size={1} color="#27272a" />
              {minimapOpen && decks.length > 1 ? (
                <MiniMap
                  position="bottom-right"
                  nodeColor="#34d399"
                  maskColor="rgba(0,0,0,0.72)"
                  className="!m-3 !overflow-hidden !rounded-xl !border !border-zinc-700 !bg-zinc-950"
                />
              ) : null}
            </ReactFlow>

            {decks.length === 1 && links.length === 0 ? (
              <p className="pointer-events-none absolute inset-x-0 bottom-16 text-center text-[11px] text-zinc-600">
                No relations yet
              </p>
            ) : null}

            {searchOpen ? (
              <div className="absolute left-2 right-14 top-2 z-20">
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Chaos Decks…"
                  className="min-h-10 w-full rounded-xl border border-zinc-700 bg-zinc-950/95 px-3 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            ) : null}

            {/* Right floating stack */}
            <div className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
              <FloatBtn
                label="Controls"
                active={sheetOpen && sheetTab === "controls"}
                onClick={() => {
                  setSheetTab("controls");
                  setSheetOpen(true);
                }}
              >
                <SlidersIcon />
              </FloatBtn>
              <FloatBtn
                label="Search"
                active={searchOpen}
                onClick={() => setSearchOpen((v) => !v)}
              >
                <SearchIcon />
              </FloatBtn>
              <FloatBtn label="Expand graph" onClick={() => setExpanded(true)}>
                <ForgeExpandIcon />
              </FloatBtn>
            </div>

            {/* Bottom-left actions */}
            <div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-2 z-20 flex flex-col gap-2">
              <FloatBtn label="Dump fragment" onClick={() => router.push("/forge/chaos")}>
                <span className="text-lg font-medium leading-none">+</span>
              </FloatBtn>
              <FloatBtn
                label="Select deck"
                active={Boolean(selectedId)}
                onClick={() => {
                  if (selectedId) setSelectedId(null);
                }}
              >
                <SelectIcon />
              </FloatBtn>
              <FloatBtn label="List view" onClick={() => setView("list")}>
                <GridIcon />
              </FloatBtn>
            </div>

            {/* MiniMap toggle — hidden for single-node graphs */}
            {decks.length > 1 ? (
              <div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-2 z-20 flex flex-col items-end gap-2">
                {minimapOpen ? (
                  <button
                    type="button"
                    aria-label="Close minimap"
                    onClick={() => setMinimapOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950/90 text-xs text-zinc-300"
                  >
                    ✕
                  </button>
                ) : null}
                <FloatBtn
                  label={minimapOpen ? "Hide minimap" : "Show minimap"}
                  active={minimapOpen}
                  onClick={() => setMinimapOpen((v) => !v)}
                >
                  <MapIcon />
                </FloatBtn>
              </div>
            ) : null}
          </ForgeExpandableSurface>

          {selectedDeck && selectedMetrics ? (
            <SelectionSheet
              deck={selectedDeck}
              metrics={selectedMetrics}
              realmTitle={title}
              realmId={realmId}
              moveTargets={realmMoveTargets}
              onClose={() => setSelectedId(null)}
              onOpen={() => router.push(`/forge/deck/${selectedDeck.id}`)}
              onMove={handleMoveDeck}
              onViewConnections={() => {
                patchPrefs({ exploreMode: "focus" });
                setSheetTab("controls");
                setSheetOpen(true);
              }}
            />
          ) : null}

          {sheetOpen ? (
            <ControlsSheet
              tab={sheetTab}
              onTabChange={setSheetTab}
              prefs={prefs}
              onPrefs={patchPrefs}
              onClose={() => setSheetOpen(false)}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function SelectionSheet({
  deck,
  metrics,
  realmTitle,
  realmId,
  moveTargets,
  onClose,
  onOpen,
  onMove,
  onViewConnections,
}: {
  deck: Af03ChaosDeck;
  metrics: DeckNodeMetrics;
  realmTitle: string;
  realmId: string;
  moveTargets: Array<{ id: string | null; label: string }>;
  onClose: () => void;
  onOpen: () => void;
  onMove: (folderId: string) => void;
  onViewConnections: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:absolute lg:inset-x-auto lg:bottom-2 lg:right-2 lg:w-[20rem] lg:px-0">
      <div
        role="dialog"
        aria-label={`Selected ${deck.title}`}
        className="rounded-2xl border border-zinc-700 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-100">{deck.title}</p>
            <p className="text-[10px] uppercase tracking-wide text-emerald-500/90">Fragment</p>
          </div>
          <button
            type="button"
            aria-label="Close selection"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-900"
          >
            ✕
          </button>
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
          <div>
            <dt className="text-zinc-600">Deck</dt>
            <dd className="truncate font-medium text-zinc-200">{deck.title}</dd>
          </div>
          <div>
            <dt className="text-zinc-600">Connections</dt>
            <dd className="font-medium text-zinc-200">{metrics.relationCount}</dd>
          </div>
          <div>
            <dt className="text-zinc-600">Mass</dt>
            <dd className="font-medium text-zinc-200">{metrics.massScore.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-zinc-600">Last used</dt>
            <dd className="font-medium text-zinc-200">
              {metrics.lastUsedAt ? formatRelativeAgo(metrics.lastUsedAt) : "—"}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-zinc-600">Realm</dt>
            <dd className="truncate font-medium text-zinc-200">{realmTitle}</dd>
          </div>
        </dl>
        <div className="mt-3 grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="min-h-10 rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-950"
          >
            Open Chaos Deck
          </button>
          <button
            type="button"
            onClick={onViewConnections}
            className="min-h-10 rounded-xl border border-zinc-700 text-sm text-zinc-200"
          >
            View connections
          </button>
          <label className="block space-y-1">
            <span className="text-[10px] uppercase tracking-wide text-zinc-500">
              Move to Realm
            </span>
            <select
              className="min-h-10 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-200"
              defaultValue=""
              onChange={(e) => {
                const value = e.target.value;
                if (!value) return;
                onMove(value);
                e.target.value = "";
              }}
            >
              <option value="">Choose realm…</option>
              {moveTargets.map((target) => (
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
        </div>
      </div>
    </div>
  );
}

function ControlsSheet({
  tab,
  onTabChange,
  prefs,
  onPrefs,
  onClose,
}: {
  tab: SheetTab;
  onTabChange: (t: SheetTab) => void;
  prefs: GraphPrefs;
  onPrefs: (p: Partial<GraphPrefs>) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/50 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:items-end"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-label="Graph controls"
        className="flex max-h-[min(70dvh,28rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
          <div
            role="tablist"
            className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-900 p-0.5 text-xs"
          >
            {(
              [
                ["controls", "Controls"],
                ["filters", "Filters"],
                ["legend", "Legend"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => onTabChange(id)}
                className={`min-h-8 rounded-md px-2 font-medium ${
                  tab === id ? "bg-zinc-100 text-zinc-950" : "text-zinc-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 text-sm text-zinc-300">
          {tab === "controls" ? (
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                  Relation
                </span>
                <select
                  value={prefs.relationFilter}
                  onChange={(e) =>
                    onPrefs({
                      relationFilter: e.target.value as GraphPrefs["relationFilter"],
                    })
                  }
                  className="min-h-10 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2 text-sm"
                >
                  <option value="all">All relations</option>
                  <option value="confirmed">Confirmed only</option>
                  <option value="suggested">Suggested only</option>
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                  Minimum strength ({prefs.minRelationStrength.toFixed(2)})
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={prefs.minRelationStrength}
                  onChange={(e) =>
                    onPrefs({ minRelationStrength: Number(e.target.value) })
                  }
                  className="w-full accent-emerald-500"
                />
              </label>
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                  Mode
                </span>
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-zinc-800 p-1">
                  {(
                    [
                      ["explore", "Explore"],
                      ["focus", "Focus"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onPrefs({ exploreMode: id })}
                      className={`min-h-9 rounded-lg text-sm font-medium ${
                        prefs.exploreMode === id
                          ? "bg-emerald-600 text-white"
                          : "text-zinc-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-zinc-600">
                  Focus dims everything except the selected deck and its direct connections.
                  No physics simulation — filter only.
                </p>
              </div>
            </div>
          ) : null}
          {tab === "filters" ? (
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>Use the search control on the canvas to filter by deck title.</li>
              <li>Relation filters live under Controls.</li>
              <li>List view shows the same Chaos Decks without a separate data model.</li>
            </ul>
          ) : null}
          {tab === "legend" ? (
            <ul className="space-y-2 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                Green intensity = recent use
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full border border-zinc-500" />
                <span className="inline-block h-4 w-4 rounded-full border border-zinc-400" />
                Size = mass
              </li>
              <li className="flex items-center gap-2">
                <span className="h-0.5 w-6 bg-violet-400" />
                Purple line = relation
              </li>
              <li className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full ring-2 ring-white" />
                White ring = selected
              </li>
              <li className="text-zinc-500">Dashed halo = affinity (not a confirmed edge)</li>
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SlidersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function SelectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 4l7 16 2.5-6.5L20 11 4 4Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 4.5 3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5 9 4.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M9 4.5v13M15 6.5v13" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export function RealmDeckGraph({ realmId }: { realmId: string }) {
  return (
    <ReactFlowProvider>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading Realm…</p>}>
        <RealmGraphCanvas realmId={realmId} />
      </Suspense>
    </ReactFlowProvider>
  );
}
