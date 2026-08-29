"use client";

/**
 * Human Move picker — choose a Realm by title (Argus pattern), never by raw id.
 */

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { folderBreadcrumb } from "@/lib/argusforge/af03-repo-store";
import type { Af03ChaosDeck, Af03RepoState } from "@/lib/argusforge/af03-repo-types";

export type MoveRealmOption = {
  id: string | null;
  title: string;
  subtitle?: string;
  disabled?: boolean;
};

type Props = {
  open: boolean;
  state: Af03RepoState;
  deck: Af03ChaosDeck;
  onClose: () => void;
  onMove: (folderId: string | null) => void;
};

export function buildMoveRealmOptions(
  state: Af03RepoState,
  deck: Af03ChaosDeck
): MoveRealmOption[] {
  const folders = [...state.folders].sort((a, b) => a.title.localeCompare(b.title));
  const realmOptions: MoveRealmOption[] = folders.map((f) => {
    const crumbs = folderBreadcrumb(state, f.id);
    const path =
      crumbs.length > 1
        ? crumbs
            .slice(0, -1)
            .map((c) => c.title)
            .join(" / ")
        : undefined;
    const current = deck.folderId === f.id;
    return {
      id: f.id,
      title: f.title,
      subtitle: [
        path,
        f.view === "archive" ? "Archive" : "Active",
        current ? "current" : null,
      ]
        .filter(Boolean)
        .join(" · "),
      disabled: current,
    };
  });

  return [
    {
      id: null,
      title: "Unassigned",
      subtitle: deck.folderId == null ? "current · root" : "Root of Explorer",
      disabled: deck.folderId == null,
    },
    ...realmOptions,
  ];
}

export function ForgeMoveDeckDialog({ open, state, deck, onClose, onMove }: Props) {
  const [mounted, setMounted] = useState(false);
  const options = useMemo(() => buildMoveRealmOptions(state, deck), [state, deck]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-3 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="forge-move-deck-title"
        className="flex max-h-[min(70dvh,28rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
      >
        <header className="shrink-0 border-b border-zinc-800 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-500/90">
            Move Chaos Deck
          </p>
          <h2
            id="forge-move-deck-title"
            className="mt-0.5 truncate text-base font-semibold text-zinc-50"
          >
            {deck.title}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Choose a Realm by name — same idea as Argus Move to Realm.
          </p>
        </header>

        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
          {options.map((opt) => (
            <li key={opt.id ?? "unassigned"}>
              <button
                type="button"
                disabled={opt.disabled}
                className="flex w-full flex-col items-start px-4 py-3 text-left hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  onMove(opt.id);
                  onClose();
                }}
              >
                <span className="text-sm font-medium text-zinc-100">{opt.title}</span>
                {opt.subtitle ? (
                  <span className="mt-0.5 text-xs text-zinc-500">{opt.subtitle}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>

        <footer className="shrink-0 border-t border-zinc-800 p-3">
          <button
            type="button"
            className="min-h-11 w-full rounded-lg border border-zinc-700 text-sm font-medium text-zinc-300"
            onClick={onClose}
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
