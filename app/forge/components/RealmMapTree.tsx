"use client";

/**
 * CHANGE 24-17 — Argus Realm Treemap (macro view).
 * Not Home. Filters: Focus | Active | Archive over the same Realms.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  buildRealmForest,
  freshnessToBorder,
  freshnessToFill,
  layoutTreemap,
  realmHeaderFill,
  realmHref,
  type RealmLifecycleFilter,
  type RealmTreeNode,
  type TreemapRect,
} from "@/lib/argusforge/af03-realm-map";
import {
  createDeck,
  createFolder,
  emptyOrSeedRepo,
  formatRelativeAgo,
} from "@/lib/argusforge/af03-repo-store";
import type { Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import { readArgusGraph } from "@/lib/argusforge/argus-graph-store";
import type { ArgusGraphState } from "@/lib/argusforge/argus-graph-types";
import { Af03RepoDisclosure } from "./Af03RepoDisclosure";

function useMapSize(ref: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ w: 320, h: 420 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      setSize({ w: Math.max(200, cr.width), h: Math.max(280, cr.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

type Props = {
  filter: RealmLifecycleFilter;
};

export function RealmMapTree({ filter }: Props) {
  const router = useRouter();
  const [state, setState] = useState<Af03RepoState | null>(null);
  const [graph, setGraph] = useState<ArgusGraphState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const size = useMapSize(mapRef);

  useEffect(() => {
    setState(emptyOrSeedRepo());
    setGraph(readArgusGraph());
  }, []);

  const forest = useMemo(
    () => (state ? buildRealmForest(state, graph, filter) : []),
    [state, graph, filter]
  );

  const rects = useMemo(() => {
    if (forest.length === 0) return [] as TreemapRect[];
    return layoutTreemap(forest, 0, 0, size.w, size.h, 0, size.w >= size.h);
  }, [forest, size.w, size.h]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    const walk = (nodes: RealmTreeNode[]): RealmTreeNode | null => {
      for (const n of nodes) {
        if (n.id === selectedId) return n;
        const c = walk(n.children);
        if (c) return c;
      }
      return null;
    };
    return walk(forest);
  }, [selectedId, forest]);

  const openRealm = useCallback(
    (id: string) => {
      router.push(realmHref(id));
    },
    [router]
  );

  function createFirstRealm() {
    const s = emptyOrSeedRepo();
    const { folder, state: next } = createFolder(s, {
      title: "New Realm",
      parentId: null,
      view: filter === "archive" ? "archive" : "active",
    });
    setState(next);
    router.push(realmHref(folder.id));
  }

  function createFirstDeck() {
    const s = emptyOrSeedRepo();
    const { deck, state: next } = createDeck(s, {
      title: "New Chaos Deck",
      folderId: null,
      view: filter === "archive" ? "archive" : "active",
    });
    setState(next);
    router.push(`/forge/deck/${deck.id}`);
  }

  if (!state) {
    return <p className="text-sm text-zinc-500">Loading Argus Realms…</p>;
  }

  const listHref = filter === "archive" ? "/forge/archive" : "/forge/active";
  const filterLabel =
    filter === "focus" ? "Focus" : filter === "archive" ? "Archive" : "Active";

  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] flex-col gap-3">
      <Af03RepoDisclosure />

      <header className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400/90">
            Argus · Realms
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-50">
            {filterLabel} Treemap
          </h2>
          <p className="text-xs text-zinc-500">
            Macro view — size is mass, color is recent use. Tap a Realm for its molecular graph.
          </p>
        </div>
        {selected ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-300">
            <p className="font-medium text-zinc-100">{selected.title}</p>
            <p className="mt-0.5 text-zinc-500">
              mass {selected.metrics.massScore.toFixed(1)} · {selected.metrics.deckCount} decks ·{" "}
              {selected.metrics.fragmentCount} fragments
              {selected.metrics.lastActivityAt
                ? ` · ${formatRelativeAgo(selected.metrics.lastActivityAt)}`
                : ""}
            </p>
          </div>
        ) : null}
      </header>

      {filter === "focus" ? (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-500">
          Focus is pending — showing the same Active Realms (no copies). Later Focus will apply
          attention signals without duplicating Realms.
        </p>
      ) : null}

      {forest.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-zinc-800 px-4 py-16 text-center">
          <p className="text-sm text-zinc-400">
            No Realms in {filterLabel}. Create a Realm or Chaos Deck.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={createFirstRealm}
              className="min-h-11 rounded-lg border border-zinc-600 bg-zinc-100 px-4 text-sm font-semibold text-zinc-900"
            >
              New Realm
            </button>
            <button
              type="button"
              onClick={createFirstDeck}
              className="min-h-11 rounded-lg border border-zinc-700 px-4 text-sm text-zinc-200"
            >
              New Chaos Deck
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={mapRef}
          className="relative min-h-[420px] flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
          role="tree"
          aria-label={`${filterLabel} Realm Treemap`}
        >
          {rects.map((r) => {
            const isHeader = r.node.children.length > 0;
            const showTitle = r.w > 48 && r.h > 22;
            const archived = r.node.view === "archive";
            const isSel = selectedId === r.id;
            return (
              <button
                key={`${r.id}-${r.depth}-${Math.round(r.x)}-${Math.round(r.y)}-${Math.round(r.w)}`}
                type="button"
                role="treeitem"
                title={`${r.title} · mass ${r.node.metrics.massScore.toFixed(1)}`}
                aria-label={`Realm ${r.title}`}
                onClick={() => {
                  setSelectedId(r.id);
                  openRealm(r.id);
                }}
                style={{
                  left: r.x,
                  top: r.y,
                  width: r.w,
                  height: r.h,
                  background: isHeader
                    ? realmHeaderFill(r.node.metrics.freshness, archived)
                    : freshnessToFill(r.node.metrics.freshness, archived, r.depth),
                  borderColor: isSel
                    ? "#34d399"
                    : freshnessToBorder(r.node.metrics.freshness, r.depth),
                }}
                className={`absolute box-border overflow-hidden border text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  isSel ? "ring-1 ring-emerald-400" : ""
                } ${isHeader ? "rounded-md" : "rounded-lg"}`}
              >
                {showTitle ? (
                  <span
                    className={`block truncate ${
                      isHeader
                        ? "px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-50"
                        : "px-2 py-2 text-xs font-semibold"
                    } ${archived && !isHeader ? "text-zinc-400" : isHeader ? "" : "text-zinc-100"}`}
                  >
                    {r.title}
                  </span>
                ) : (
                  <span className="sr-only">{r.title}</span>
                )}
                {!isHeader && r.h > 52 && r.w > 72 ? (
                  <span className="block px-2 text-[10px] text-emerald-100/70">
                    {r.node.metrics.deckCount}d · m{r.node.metrics.massScore.toFixed(0)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      <p className="shrink-0 text-[11px] text-zinc-600">
        Metrics provisional (log mass, recency color).{" "}
        <Link href={listHref} className="underline hover:text-zinc-400">
          Administrative list
        </Link>
        {" · "}
        <Link href="/forge/argus/units" className="underline hover:text-zinc-400">
          Unit graph
        </Link>
      </p>
    </div>
  );
}
