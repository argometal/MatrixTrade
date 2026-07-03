"use client";

import { useMemo, useState } from "react";
import type { Entity, EntityType } from "@/lib/argus/types";
import { ENTITY_TYPE_LABELS } from "@/lib/argus/labels";
import { REFERENCES, REFERENCE_PICKER } from "@/lib/argus/ux-copy";
import { FAVORITES_KEY } from "@/lib/argus/journal-helpers";
import { inputClass } from "./ui";
import { ReferenceCreateModal } from "./ReferenceCreateModal";

export interface EntityPickerBuckets {
  recent: Entity[];
  frequent: Entity[];
  alphabetical: Entity[];
}

interface ReferenceLinkPanelProps {
  buckets: EntityPickerBuckets;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
  pendingNewName?: string;
  onPendingNew: (data: { name: string; entityType: EntityType; notes: string } | null) => void;
}

function loadFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveFavorites(ids: string[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

function ReferenceRow({
  entity,
  checked,
  onToggle,
  onFavorite,
  isFavorite,
}: {
  entity: Entity;
  checked: boolean;
  onToggle: () => void;
  onFavorite: () => void;
  isFavorite: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-zinc-800/60">
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
        <input type="checkbox" checked={checked} onChange={onToggle} className="shrink-0" />
        <span className="truncate text-sm text-zinc-200">{entity.name}</span>
        <span className="shrink-0 text-xs text-zinc-500">{ENTITY_TYPE_LABELS[entity.type]}</span>
      </label>
      <button
        type="button"
        onClick={onFavorite}
        className={`shrink-0 px-1 text-sm ${isFavorite ? "text-amber-400" : "text-zinc-600 hover:text-zinc-400"}`}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        {isFavorite ? "★" : "☆"}
      </button>
    </div>
  );
}

export function ReferenceLinkPanel({
  buckets,
  selectedIds,
  onChange,
  onClose,
  pendingNewName,
  onPendingNew,
}: ReferenceLinkPanelProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"recent" | "favorites">("recent");
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());
  const [createOpen, setCreateOpen] = useState(false);

  const allEntities = buckets.alphabetical;
  const hasReferences = allEntities.length > 0;

  const favoriteEntities = useMemo(
    () => allEntities.filter((e) => favorites.includes(e.id)),
    [allEntities, favorites]
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allEntities.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q)
    );
  }, [allEntities, query]);

  const visible = query.trim()
    ? searchResults
    : tab === "favorites"
      ? favoriteEntities
      : buckets.recent.length > 0
        ? buckets.recent
        : buckets.frequent;

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  function toggleFavorite(id: string) {
    const next = favorites.includes(id) ? favorites.filter((x) => x !== id) : [...favorites, id];
    setFavorites(next);
    saveFavorites(next);
  }

  return (
    <>
      <aside className="flex h-full w-full max-w-sm shrink-0 flex-col border-l border-zinc-800 bg-zinc-950/95 p-4 sm:w-80">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={REFERENCE_PICKER.searchPlaceholder}
          className={inputClass}
          autoFocus
        />

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="mt-3 w-full rounded-xl border border-teal-800/60 bg-teal-950/40 py-2.5 text-sm font-medium text-teal-300 hover:bg-teal-900/40"
        >
          + {REFERENCES.createNew}
        </button>

        {!query.trim() && (
          <div className="mt-3 flex gap-1">
            {(["recent", "favorites"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  tab === t ? "bg-teal-600/25 text-teal-300" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {t === "recent" ? REFERENCE_PICKER.recent : REFERENCE_PICKER.favorites}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 min-h-0 flex-1 space-y-0.5 overflow-y-auto rounded-xl border border-zinc-800 p-1">
          {!hasReferences && !query.trim() ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm text-zinc-500">{REFERENCES.empty}</p>
              <p className="mt-1 text-xs text-zinc-600">{REFERENCES.emptyHint}</p>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600"
              >
                {REFERENCES.createNew}
              </button>
            </div>
          ) : visible.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-zinc-500">
              {query.trim()
                ? REFERENCE_PICKER.typeToSearch
                : tab === "favorites"
                  ? REFERENCE_PICKER.starToPin
                  : REFERENCE_PICKER.noReferences}
            </p>
          ) : (
            visible.map((entity) => (
              <ReferenceRow
                key={entity.id}
                entity={entity}
                checked={selectedIds.includes(entity.id)}
                onToggle={() => toggle(entity.id)}
                onFavorite={() => toggleFavorite(entity.id)}
                isFavorite={favorites.includes(entity.id)}
              />
            ))
          )}
        </div>

        {pendingNewName && (
          <p className="mt-2 text-xs text-teal-400">{REFERENCES.pendingNew(pendingNewName)}</p>
        )}

        {selectedIds.length > 0 && (
          <p className="mt-2 text-xs text-teal-400/90">
            {REFERENCE_PICKER.selected(
              selectedIds.length,
              selectedIds
                .map((id) => allEntities.find((e) => e.id === id)?.name)
                .filter(Boolean)
                .join(", ")
            )}
          </p>
        )}

        <div className="mt-4 flex gap-2 border-t border-zinc-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            {REFERENCES.cancel}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg bg-teal-700 py-2.5 text-sm font-medium text-white hover:bg-teal-600"
          >
            {REFERENCES.select}
          </button>
        </div>
      </aside>

      <ReferenceCreateModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onSave={(data) => {
          onPendingNew(data);
          setCreateOpen(false);
        }}
      />
    </>
  );
}
