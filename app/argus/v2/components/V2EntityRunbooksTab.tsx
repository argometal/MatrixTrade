"use client";

import type { RefObject } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Runbook, RunbookProgress } from "@/lib/argus/types";
import {
  applyRunbookProgress,
  findRunbookProgress,
  runbookProgress as calcProgress,
} from "@/lib/argus/runbook-helpers";
import {
  copyRunbookToEntityAction,
  linkRunbookToEntityAction,
  moveRunbookToEntityAction,
  unlinkRunbookFromEntityAction,
} from "@/app/argus/actions";
import { formatArgusError } from "@/lib/argus/persistence/errors";
import { V2RunbookWorkPanel, type RunbookPeerList } from "./V2RunbookWorkPanel";
import { V2RunbookCreateStrip } from "./V2RunbookCreateStrip";

type Level = "organization" | "project" | "topic" | "event";

export type RunbookPeerOrg = { id: string; name: string };

/**
 * Runbooks tab for Org (library + admin) or Project/Topic/Event (linked + execute with per-level progress).
 */
export function V2EntityRunbooksTab({
  level,
  entityId,
  linkedRunbooks,
  libraryRunbooks = [],
  progressRecords = [],
  peerOrganizations = [],
  organizationId,
  organizationName,
}: {
  level: Level;
  entityId: string;
  linkedRunbooks: Runbook[];
  /** Org library / other runbooks available to link (not yet linked here). */
  libraryRunbooks?: Runbook[];
  progressRecords?: RunbookProgress[];
  /** Other orgs — used on organization library for copy/move runbook. */
  peerOrganizations?: RunbookPeerOrg[];
  /** Linked organization — enables "Edit on organization" from Project/Topic/Event execute mode. */
  organizationId?: string;
  organizationName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlRunbookId = searchParams.get("runbook") ?? "";
  const returnToRaw = searchParams.get("returnTo");
  const returnToProjectHref =
    level === "organization" && returnToRaw && returnToRaw.startsWith("/argus/")
      ? returnToRaw
      : null;

  const [screen, setScreen] = useState<"home" | "runbook">(urlRunbookId ? "runbook" : "home");
  const [selectedId, setSelectedId] = useState(urlRunbookId);
  const [showCreate, setShowCreate] = useState(level === "organization" && linkedRunbooks.length === 0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [cardMenuId, setCardMenuId] = useState<string | null>(null);
  const [cardSubmenu, setCardSubmenu] = useState<"copy" | "move" | null>(null);
  const [view, setView] = useState<"grid" | "list" | "board">("board");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const viewStorageKey = `argus-v2-runbooks-view:${level}:${entityId}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(viewStorageKey);
      if (raw === "grid" || raw === "list" || raw === "board") setView(raw);
    } catch {
      /* ignore */
    }
  }, [viewStorageKey]);

  function setViewPersist(next: "grid" | "list" | "board") {
    setView(next);
    try {
      localStorage.setItem(viewStorageKey, next);
    } catch {
      /* quota */
    }
  }

  const isLibrary = level === "organization";
  const selected = useMemo(
    () => linkedRunbooks.find((r) => r.id === selectedId) ?? libraryRunbooks.find((r) => r.id === selectedId),
    [linkedRunbooks, libraryRunbooks, selectedId]
  );

  const progressForSelected = selected
    ? findRunbookProgress(progressRecords, selected.id, entityId)
    : undefined;

  const displayRunbook = useMemo(() => {
    if (!selected) return null;
    // Always merge scoped progress. Never show raw template item.done — that made
    // Organization library and first Project toggles disagree with saved progress.
    return {
      ...selected,
      items: applyRunbookProgress(selected, progressForSelected ?? null),
    };
  }, [selected, progressForSelected]);

  const linkable = useMemo(
    () => libraryRunbooks.filter((rb) => !rb.linkedEntityIds.includes(entityId)),
    [libraryRunbooks, entityId]
  );

  const peerLists: RunbookPeerList[] = useMemo(() => {
    const map = new Map<string, string>();
    for (const rb of [...linkedRunbooks, ...libraryRunbooks]) {
      if (rb.id === selectedId) continue;
      map.set(rb.id, rb.title);
    }
    return [...map.entries()].map(([id, title]) => ({ id, title }));
  }, [linkedRunbooks, libraryRunbooks, selectedId]);

  const replaceParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const known =
      Boolean(urlRunbookId) &&
      (linkedRunbooks.some((r) => r.id === urlRunbookId) ||
        libraryRunbooks.some((r) => r.id === urlRunbookId));
    if (known) {
      setSelectedId(urlRunbookId);
      setScreen("runbook");
      setShowCreate(false);
      return;
    }
    if (!urlRunbookId) {
      setScreen("home");
      setSelectedId("");
    }
  }, [urlRunbookId, linkedRunbooks, libraryRunbooks]);

  useEffect(() => {
    if (!cardMenuId) {
      setCardSubmenu(null);
      return;
    }
    function onDoc(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setCardMenuId(null);
        setCardSubmenu(null);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [cardMenuId]);

  function openRunbook(id: string) {
    setSelectedId(id);
    setScreen("runbook");
    setShowCreate(false);
    setCardMenuId(null);
    replaceParams((params) => {
      params.set("tab", "Runbooks");
      params.set("runbook", id);
    });
  }

  function backToHome() {
    setScreen("home");
    setSelectedId("");
    replaceParams((params) => {
      params.delete("runbook");
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        const { layer, message } = formatArgusError(err);
        setError(`${layer.toUpperCase()}: ${message}`);
      }
    });
  }

  const editOnOrganizationHref = useMemo(() => {
    if (isLibrary || !organizationId || !selectedId) return null;
    const returnParams = new URLSearchParams(searchParams.toString());
    returnParams.set("tab", "Runbooks");
    returnParams.set("runbook", selectedId);
    returnParams.delete("returnTo");
    const returnQuery = returnParams.toString();
    const returnPath = returnQuery ? `${pathname}?${returnQuery}` : pathname;
    const params = new URLSearchParams();
    params.set("tab", "Runbooks");
    params.set("runbook", selectedId);
    params.set("returnTo", returnPath);
    return `/argus/v2/organizations/${organizationId}?${params.toString()}`;
  }, [isLibrary, organizationId, selectedId, pathname, searchParams]);

  if (screen === "runbook" && displayRunbook) {
    return (
      <V2RunbookWorkPanel
        runbook={displayRunbook}
        onBack={backToHome}
        backLabel="All runbooks"
        scopeEntityId={entityId}
        closed={progressForSelected?.closed ?? false}
        executeMode={!isLibrary}
        peerLists={peerLists}
        editOnOrganizationHref={editOnOrganizationHref}
        returnToProjectHref={returnToProjectHref}
        returnToProjectLabel={
          organizationName ? `Back to project` : "Back to project"
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {returnToProjectHref ? (
        <Link
          href={returnToProjectHref}
          className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/15"
        >
          ← Back to project
        </Link>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">Runbooks</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {isLibrary
              ? "Organization library — create checklists, then link them to projects, topics, or events. Copy or move lists between organizations."
              : "Checklists linked here. Progress (checks / closed) is saved only for this level. Edit the shared template on the organization."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {linkedRunbooks.length > 0 ? (
            <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950/60 p-0.5">
              {(
                [
                  { id: "grid" as const, label: "▦", title: "Grid" },
                  { id: "list" as const, label: "☰", title: "List" },
                  { id: "board" as const, label: "▥", title: "Board" },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  title={option.title}
                  aria-label={option.title}
                  aria-pressed={view === option.id}
                  onClick={() => setViewPersist(option.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-sm ${
                    view === option.id
                      ? "bg-lime-500/15 text-lime-300"
                      : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
          {isLibrary ? (
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="rounded-xl border border-lime-500/30 bg-lime-500/10 px-3 py-1.5 text-xs font-semibold text-lime-300 hover:bg-lime-500/15"
            >
              {showCreate ? "Hide form" : "+ Runbook"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAssignOpen((v) => !v)}
              className="rounded-xl border border-lime-500/30 bg-lime-500/10 px-3 py-1.5 text-xs font-semibold text-lime-300 hover:bg-lime-500/15"
            >
              {assignOpen ? "Hide assign" : "Assign from library"}
            </button>
          )}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-xs text-rose-200">{error}</p>
      ) : null}

      {showCreate && isLibrary ? (
        <V2RunbookCreateStrip
          entityId={entityId}
          onCreated={(id) => openRunbook(id)}
          onCancel={() => setShowCreate(false)}
        />
      ) : null}

      {assignOpen && !isLibrary ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="mb-3 text-xs text-zinc-500">
            Select runbooks from the organization library (or other linked templates), then assign.
          </p>
          {linkable.length === 0 ? (
            <p className="text-sm text-zinc-500">No more runbooks to assign — create them on the Organization.</p>
          ) : (
            <ul className="mb-3 max-h-48 space-y-1 overflow-y-auto">
              {linkable.map((rb) => (
                <li key={rb.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800/80">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(rb.id)}
                      onChange={() => toggleSelect(rb.id)}
                      className="rounded border-zinc-600"
                    />
                    {rb.title}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending || selectedIds.length === 0}
              onClick={() =>
                run(async () => {
                  for (const id of selectedIds) {
                    await linkRunbookToEntityAction(id, entityId);
                  }
                  setSelectedIds([]);
                  setAssignOpen(false);
                })
              }
              className="rounded-lg bg-lime-500/15 px-3 py-1.5 text-xs font-semibold text-lime-300 ring-1 ring-lime-500/30 disabled:opacity-40"
            >
              Assign selected ({selectedIds.length})
            </button>
            <button
              type="button"
              disabled={isPending || selectedIds.length !== 1}
              onClick={() =>
                run(async () => {
                  const id = selectedIds[0];
                  if (!id) return;
                  const result = await copyRunbookToEntityAction(id, entityId);
                  setSelectedIds([]);
                  openRunbook(result.id);
                })
              }
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-40"
            >
              Copy selected here
            </button>
          </div>
        </div>
      ) : null}

      {linkedRunbooks.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
          {isLibrary
            ? "No runbooks yet — create a checklist template above."
            : "No runbooks linked yet — assign from the organization library."}
        </p>
      ) : view === "board" ? (
        <div className="argus-v2-scroll flex gap-3 overflow-x-auto pb-2">
          {(["Open", "In progress", "Closed"] as const).map((column) => {
            const columnCards = linkedRunbooks.filter((runbook) => {
              const prog = findRunbookProgress(progressRecords, runbook.id, entityId);
              const items = applyRunbookProgress(runbook, prog ?? null);
              const stats = calcProgress(items);
              const bucket =
                prog?.closed || (stats.total > 0 && stats.open === 0)
                  ? "Closed"
                  : stats.done > 0
                    ? "In progress"
                    : "Open";
              return bucket === column;
            });
            return (
              <div
                key={column}
                className="flex w-72 shrink-0 flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/30"
              >
                <div className="border-b border-zinc-800/80 px-3 py-2.5">
                  <h3 className="text-sm font-semibold text-zinc-200">{column}</h3>
                  <p className="text-[11px] text-zinc-600">{columnCards.length}</p>
                </div>
                <div className="min-h-[8rem] space-y-2 p-2">
                  {columnCards.length === 0 ? (
                    <p className="px-1 py-8 text-center text-xs text-zinc-600">No runbooks</p>
                  ) : (
                    columnCards.map((runbook) => (
                      <RunbookHomeCard
                        key={runbook.id}
                        runbook={runbook}
                        entityId={entityId}
                        progressRecords={progressRecords}
                        isLibrary={isLibrary}
                        isPending={isPending}
                        cardMenuId={cardMenuId}
                        cardSubmenu={cardSubmenu}
                        menuRef={menuRef}
                        peerOrganizations={peerOrganizations}
                        dense
                        onOpen={() => openRunbook(runbook.id)}
                        onMenuToggle={() => {
                          setCardMenuId((current) => (current === runbook.id ? null : runbook.id));
                          setCardSubmenu(null);
                        }}
                        onSubmenu={setCardSubmenu}
                        onCopyOrMove={(mode, orgId, orgName) =>
                          run(async () => {
                            if (mode === "copy") {
                              await copyRunbookToEntityAction(runbook.id, orgId);
                            } else {
                              if (
                                !window.confirm(
                                  `Move “${runbook.title}” to ${orgName}? It will leave this organization library.`
                                )
                              ) {
                                return;
                              }
                              await moveRunbookToEntityAction(runbook.id, entityId, orgId);
                            }
                            setCardMenuId(null);
                            setCardSubmenu(null);
                          })
                        }
                        onUnlink={() => run(() => unlinkRunbookFromEntityAction(runbook.id, entityId))}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className={
            view === "list" ? "space-y-2" : "grid gap-3 sm:grid-cols-2"
          }
        >
          {linkedRunbooks.map((runbook) => (
            <RunbookHomeCard
              key={runbook.id}
              runbook={runbook}
              entityId={entityId}
              progressRecords={progressRecords}
              isLibrary={isLibrary}
              isPending={isPending}
              cardMenuId={cardMenuId}
              cardSubmenu={cardSubmenu}
              menuRef={menuRef}
              peerOrganizations={peerOrganizations}
              dense={view === "list"}
              onOpen={() => openRunbook(runbook.id)}
              onMenuToggle={() => {
                setCardMenuId((current) => (current === runbook.id ? null : runbook.id));
                setCardSubmenu(null);
              }}
              onSubmenu={setCardSubmenu}
              onCopyOrMove={(mode, orgId, orgName) =>
                run(async () => {
                  if (mode === "copy") {
                    await copyRunbookToEntityAction(runbook.id, orgId);
                  } else {
                    if (
                      !window.confirm(
                        `Move “${runbook.title}” to ${orgName}? It will leave this organization library.`
                      )
                    ) {
                      return;
                    }
                    await moveRunbookToEntityAction(runbook.id, entityId, orgId);
                  }
                  setCardMenuId(null);
                  setCardSubmenu(null);
                })
              }
              onUnlink={() => run(() => unlinkRunbookFromEntityAction(runbook.id, entityId))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RunbookHomeCard({
  runbook,
  entityId,
  progressRecords,
  isLibrary,
  isPending,
  cardMenuId,
  cardSubmenu,
  menuRef,
  peerOrganizations,
  dense,
  onOpen,
  onMenuToggle,
  onSubmenu,
  onCopyOrMove,
  onUnlink,
}: {
  runbook: Runbook;
  entityId: string;
  progressRecords: RunbookProgress[];
  isLibrary: boolean;
  isPending: boolean;
  cardMenuId: string | null;
  cardSubmenu: "copy" | "move" | null;
  menuRef: RefObject<HTMLDivElement | null>;
  peerOrganizations: RunbookPeerOrg[];
  dense?: boolean;
  onOpen: () => void;
  onMenuToggle: () => void;
  onSubmenu: (next: "copy" | "move" | null) => void;
  onCopyOrMove: (mode: "copy" | "move", orgId: string, orgName: string) => void;
  onUnlink: () => void;
}) {
  const prog = findRunbookProgress(progressRecords, runbook.id, entityId);
  const items = applyRunbookProgress(runbook, prog ?? null);
  const stats = calcProgress(items);
  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const menuOpen = cardMenuId === runbook.id;

  return (
    <div
      className={`relative flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 transition hover:border-lime-500/30 ${
        dense ? "p-3" : "p-4"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-semibold text-zinc-100">{runbook.title}</span>
            {prog?.closed ? (
              <span className="shrink-0 text-[10px] font-medium text-sky-300">Closed</span>
            ) : null}
          </div>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <span className="block h-full rounded-full bg-lime-500/60" style={{ width: `${pct}%` }} />
          </span>
          <span className="mt-2 block text-[10px] tabular-nums text-zinc-500">
            {stats.open} open · {stats.done}/{stats.total} checks
          </span>
        </button>
        {isLibrary ? (
          <div ref={menuOpen ? menuRef : undefined} className="relative shrink-0">
            <button
              type="button"
              disabled={isPending}
              onClick={onMenuToggle}
              className="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              aria-label="Runbook actions"
            >
              ···
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-20 mt-1 min-w-[12rem] rounded-xl border border-zinc-700 bg-zinc-950 py-1 shadow-xl">
                {cardSubmenu === null ? (
                  <>
                    <button
                      type="button"
                      className="block w-full px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
                      disabled={peerOrganizations.length === 0}
                      onClick={() => onSubmenu("copy")}
                    >
                      Copy to organization…
                    </button>
                    <button
                      type="button"
                      className="block w-full px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
                      disabled={peerOrganizations.length === 0}
                      onClick={() => onSubmenu("move")}
                    >
                      Move to organization…
                    </button>
                    {peerOrganizations.length === 0 ? (
                      <p className="border-t border-zinc-800 px-3 py-2 text-[10px] text-zinc-600">
                        No other organizations available.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="block w-full px-3 py-1.5 text-left text-[10px] uppercase tracking-wide text-zinc-500 hover:bg-zinc-800"
                      onClick={() => onSubmenu(null)}
                    >
                      ← Back
                    </button>
                    <p className="px-3 pb-1 text-[10px] text-zinc-500">
                      {cardSubmenu === "copy" ? "Copy to" : "Move to"}
                    </p>
                    <ul className="max-h-48 overflow-y-auto">
                      {peerOrganizations.map((org) => (
                        <li key={org.id}>
                          <button
                            type="button"
                            className="block w-full truncate px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800"
                            onClick={() => onCopyOrMove(cardSubmenu, org.id, org.name)}
                          >
                            {org.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {!isLibrary ? (
        <button
          type="button"
          disabled={isPending}
          onClick={onUnlink}
          className="self-start text-[10px] text-zinc-600 hover:text-rose-300"
        >
          Unlink
        </button>
      ) : null}
    </div>
  );
}
