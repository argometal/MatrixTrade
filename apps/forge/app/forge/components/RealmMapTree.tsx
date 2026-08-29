"use client";

/**
 * CHANGE 24-17 / 24-25 — Argus Realm Treemap (macro view).
 * Experimental relational surface — not Home Explorer.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { homeExplorerHref } from "@/lib/argusforge/af03-home-explorer";
import {
  buildRealmForest,
  formatUsedLabel,
  freshnessToBorder,
  freshnessToFill,
  isUnassignedRealm,
  layoutTreemap,
  realmHeaderFill,
  realmHref,
  type RealmLifecycleFilter,
  type RealmTreeNode,
  type TreemapRect,
} from "@/lib/argusforge/af03-realm-map";
import {
  createFolder,
  emptyOrSeedRepo,
  formatRelativeAgo,
} from "@/lib/argusforge/af03-repo-store";
import type { Af03RepoState } from "@/lib/argusforge/af03-repo-types";
import { readArgusGraph } from "@/lib/argusforge/argus-graph-store";
import type { ArgusGraphState } from "@/lib/argusforge/argus-graph-types";
import { Af03RepoDisclosure } from "./Af03RepoDisclosure";
import { ForgeExpandableSurface } from "./ForgeExpandableSurface";

const UNASSIGNED_STRIP_H = 72;

function useMapSize(ref: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ w: 320, h: 360 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      setSize({ w: Math.max(200, cr.width), h: Math.max(240, cr.height) });
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

  useEffect(() => {
    setSelectedId(null);
  }, [filter]);

  /** Focus intelligence not implemented — land on Active. */
  useEffect(() => {
    if (filter === "focus") {
      router.replace("/forge/argus?filter=active");
    }
  }, [filter, router]);

  const forest = useMemo(
    () => (state ? buildRealmForest(state, graph, filter) : []),
    [state, graph, filter]
  );

  const realmRoots = useMemo(
    () => forest.filter((n) => !n.synthetic),
    [forest]
  );
  const unassigned = useMemo(
    () => forest.find((n) => n.synthetic) ?? null,
    [forest]
  );

  const realmAreaH = Math.max(
    160,
    unassigned ? size.h - UNASSIGNED_STRIP_H - 6 : size.h
  );

  const rects = useMemo(() => {
    if (realmRoots.length === 0) return [] as TreemapRect[];
    return layoutTreemap(realmRoots, 0, 0, size.w, realmAreaH, 0, size.w >= realmAreaH);
  }, [realmRoots, size.w, realmAreaH]);

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

  function setFilter(next: RealmLifecycleFilter) {
    if (next === "focus") return;
    const qs = next === "active" ? "active" : next;
    router.replace(`/forge/argus?filter=${qs}`);
  }

  function createFirstRealm() {
    const s = emptyOrSeedRepo();
    const { folder, state: next } = createFolder(s, {
      title: "New Realm",
      parentId: null,
      view: filter === "archive" ? "archive" : "active",
    });
    setState(next);
    setSelectedId(folder.id);
  }

  if (!state) {
    return <p className="text-sm text-zinc-500">Loading Argus Realms…</p>;
  }

  const filterLabel =
    filter === "focus" ? "Focus" : filter === "archive" ? "Archive" : "Active";
  const emptyRealms = realmRoots.length === 0 && !unassigned;

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col gap-2.5 pb-2">
      <Af03RepoDisclosure compact />

      <div className="shrink-0 space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400/90">
          Realm Map · {filterLabel}
        </p>
        <p className="text-xs text-zinc-500">
          Size = content mass · Color = recent use
        </p>
        <p className="text-[11px] text-zinc-600">
          <Link href="/forge" className="text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline">
            Home Explorer
          </Link>
          {" · "}
          <Link
            href="/forge/argus/units"
            className="text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
          >
            Unit graph
          </Link>
        </p>
      </div>

      {/* Filters above Treemap */}
      <div
        className="flex shrink-0 gap-1.5"
        role="group"
        aria-label="Realm lifecycle filter"
      >
        {(
          [
            { id: "active" as const, label: "Active", disabled: false },
            { id: "archive" as const, label: "Archive", disabled: false },
            { id: "focus" as const, label: "Focus · Soon", disabled: true },
          ] as const
        ).map((chip) => {
          const active = !chip.disabled && filter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              disabled={chip.disabled}
              aria-pressed={active}
              onClick={() => setFilter(chip.id)}
              className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
                chip.disabled
                  ? "cursor-not-allowed border border-zinc-800 text-zinc-600"
                  : active
                    ? "border border-emerald-500/70 bg-emerald-950/50 text-emerald-200"
                    : "border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {emptyRealms ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 px-4 py-14 text-center">
          <p className="text-sm text-zinc-400">No {filterLabel} Realms</p>
          <div className="flex w-full max-w-xs flex-col gap-2">
            <Link
              href="/forge"
              className="flex min-h-11 items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold text-white"
            >
              Open Explorer
            </Link>
            <button
              type="button"
              onClick={() => setFilter(filter === "archive" ? "active" : "archive")}
              className="min-h-11 rounded-lg border border-zinc-700 text-sm text-zinc-200"
            >
              Change filter
            </button>
            <button
              type="button"
              onClick={createFirstRealm}
              className="min-h-11 text-sm text-zinc-500 underline-offset-2 hover:underline"
            >
              New Realm
            </button>
          </div>
        </div>
      ) : (
        <ForgeExpandableSurface
          contentRef={mapRef}
          className="relative min-h-[280px] max-h-[min(52dvh,420px)] flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
          surfaceRole="tree"
          surfaceAriaLabel={`${filterLabel} Realm Treemap`}
          ariaLabel="Fullscreen Realm Treemap"
          backTitle="Back to Argus"
          backSubtitle="Collapse treemap"
          expandAriaLabel="Expand treemap fullscreen"
          expandTitle="Expand treemap"
        >
          {rects.map((r) => (
            <RealmTile
              key={`${r.id}-${r.depth}-${Math.round(r.x)}-${Math.round(r.y)}`}
              rect={r}
              selected={selectedId === r.id}
              onSelect={() => setSelectedId(r.id)}
            />
          ))}

          {unassigned ? (
            <button
              type="button"
              role="treeitem"
              aria-selected={selectedId === unassigned.id}
              aria-label="Inbox Unassigned"
              onClick={() => setSelectedId(unassigned.id)}
              className={`absolute box-border overflow-hidden rounded-lg border border-dashed px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                selectedId === unassigned.id
                  ? "border-zinc-400 ring-1 ring-zinc-400"
                  : "border-zinc-700"
              }`}
              style={{
                left: 4,
                top: Math.max(4, size.h - UNASSIGNED_STRIP_H),
                width: Math.max(0, size.w - 8),
                height: UNASSIGNED_STRIP_H - 4,
                background: "rgb(24, 24, 27)",
              }}
            >
              <span className="block truncate text-xs font-semibold text-zinc-200">
                Inbox / Unassigned
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
                {unassigned.metrics.deckCount} Decks · Needs organization
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-zinc-600">
                {formatUsedLabel(unassigned.metrics.lastActivityAt)}
              </span>
            </button>
          ) : null}

          {realmRoots.length === 0 && unassigned ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[calc(100%-4.5rem)] items-center justify-center px-4 text-center text-xs text-zinc-600">
              No Realms yet — Inbox / Unassigned holds free Chaos Decks.
            </div>
          ) : null}
        </ForgeExpandableSurface>
      )}

      {selected ? (
        <RealmDetailPanel
          node={selected}
          onOpenGraph={() => router.push(realmHref(selected.id))}
          onOpenExplorer={() =>
            router.push(
              homeExplorerHref({
                realmId: isUnassignedRealm(selected.id) ? null : selected.id,
                status: selected.view === "archive" ? "archive" : "all",
              })
            )
          }
        />
      ) : null}

      {!emptyRealms && !selected ? (
        <p className="shrink-0 text-[11px] text-zinc-600">
          Tap a Realm to inspect · then open graph or Explorer.
        </p>
      ) : null}
    </div>
  );
}

function RealmTile({
  rect: r,
  selected,
  onSelect,
}: {
  rect: TreemapRect;
  selected: boolean;
  onSelect: () => void;
}) {
  const isHeader = r.node.children.length > 0;
  const archived = r.node.view === "archive";
  const showTitle = r.w > 44 && r.h > 20;
  const showCounts = !isHeader && r.h > 44 && r.w > 64;
  const showUsed = !isHeader && r.h > 62 && r.w > 80;
  const m = r.node.metrics;

  return (
    <button
      type="button"
      role="treeitem"
      aria-selected={selected}
      title={`${r.title} · ${m.deckCount} Decks · ${m.fragmentCount} Fragments`}
      aria-label={`Realm ${r.title}`}
      onClick={onSelect}
      style={{
        left: r.x,
        top: r.y,
        width: r.w,
        height: r.h,
        background: isHeader
          ? realmHeaderFill(m.freshness, archived)
          : freshnessToFill(m.freshness, archived, r.depth),
        borderColor: selected ? "#34d399" : freshnessToBorder(m.freshness, r.depth),
      }}
      className={`absolute box-border overflow-hidden border text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
        selected ? "ring-1 ring-emerald-400" : ""
      } ${isHeader ? "rounded-md" : "rounded-lg"}`}
    >
      {showTitle ? (
        <span
          className={`block truncate px-2 ${
            isHeader
              ? "py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-50"
              : "pt-2 text-xs font-semibold text-zinc-50"
          } ${archived && !isHeader ? "text-zinc-300" : ""}`}
        >
          {r.title}
        </span>
      ) : (
        <span className="sr-only">{r.title}</span>
      )}
      {showCounts ? (
        <span className="block truncate px-2 text-[10px] leading-snug text-emerald-50/85">
          {m.deckCount} Decks · {m.fragmentCount} Fragments
        </span>
      ) : null}
      {showUsed ? (
        <span className="block truncate px-2 pb-1 text-[10px] text-emerald-100/70">
          {formatUsedLabel(m.lastActivityAt)}
        </span>
      ) : null}
    </button>
  );
}

function RealmDetailPanel({
  node,
  onOpenGraph,
  onOpenExplorer,
}: {
  node: RealmTreeNode;
  onOpenGraph: () => void;
  onOpenExplorer: () => void;
}) {
  const unassigned = node.synthetic;
  return (
    <section
      aria-label="Selected Realm"
      className="shrink-0 space-y-2.5 rounded-xl border border-zinc-800 bg-zinc-950/90 px-3 py-3"
    >
      <div className="flex items-start gap-2.5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
            unassigned
              ? "bg-zinc-800 text-zinc-300"
              : "bg-emerald-500/15 text-emerald-300"
          }`}
          aria-hidden
        >
          {unassigned ? "∅" : "R"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-zinc-50">{node.title}</h3>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                node.view === "archive"
                  ? "bg-zinc-800 text-zinc-400"
                  : "bg-emerald-900/50 text-emerald-200"
              }`}
            >
              {node.view === "archive" ? "Archive" : "Active"}
            </span>
          </div>
          <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500">
            <div>
              <dt className="sr-only">Decks</dt>
              <dd>{node.metrics.deckCount} Decks</dd>
            </div>
            <div>
              <dt className="sr-only">Fragments</dt>
              <dd>{node.metrics.fragmentCount} Fragments</dd>
            </div>
            <div>
              <dt className="sr-only">Last used</dt>
              <dd>
                Last used{" "}
                {node.metrics.lastActivityAt
                  ? formatRelativeAgo(node.metrics.lastActivityAt)
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpenGraph}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 text-sm font-medium text-zinc-100 hover:border-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
        >
          Open graph
        </button>
        <button
          type="button"
          onClick={onOpenExplorer}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 text-sm font-medium text-zinc-100 hover:border-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
        >
          Open in Explorer
        </button>
      </div>
    </section>
  );
}
