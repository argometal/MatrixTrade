"use client";

import { useEffect, useMemo, useState } from "react";
import type { Entity } from "@/lib/argus/types";
import type { CreatedEntityResult } from "@/app/argus/actions";
import {
  REFERENCE_KINDS,
  REFERENCE_KIND_LABELS,
  entityKindLabel,
  type ReferenceKind,
} from "@/lib/argus/reference-types";
import { REFERENCES, REFERENCE_PICKER } from "@/lib/argus/ux-copy";
import { FAVORITES_KEY } from "@/lib/argus/journal-helpers";
import { inputClass } from "./ui";
import { CreateAndLinkModal } from "./CreateAndLinkModal";

type Tab = "recent" | "favorites" | "frequent" | "search" | "alpha";

export interface EntityPickerBuckets {
  recent: Entity[];
  frequent: Entity[];
  alphabetical: Entity[];
}

interface EntityPickerProps {
  buckets: EntityPickerBuckets;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onValidityChange?: (valid: boolean) => void;
  quickCreateName: string;
  onQuickCreateNameChange: (value: string) => void;
  quickCreateKind: ReferenceKind;
  onQuickCreateKindChange: (value: ReferenceKind) => void;
  quickCreateNotes: string;
  onQuickCreateNotesChange: (value: string) => void;
  defaultShowCreate?: boolean;
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

function EntityRow({
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
        <span className="shrink-0 text-xs text-zinc-500">{entityKindLabel(entity)}</span>
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

export function EntityPicker({
  buckets,
  selectedIds,
  onChange,
  onValidityChange,
  quickCreateName,
  onQuickCreateNameChange,
  quickCreateKind,
  onQuickCreateKindChange,
  quickCreateNotes,
  onQuickCreateNotesChange,
  defaultShowCreate = false,
}: EntityPickerProps) {
  const [tab, setTab] = useState<Tab>("recent");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());
  const [createOpen, setCreateOpen] = useState(defaultShowCreate);

  useEffect(() => {
    onValidityChange?.(selectedIds.length > 0);
  }, [selectedIds, onValidityChange]);

  const allEntities = buckets.alphabetical;

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
        entityKindLabel(e).toLowerCase().includes(q)
    );
  }, [allEntities, query]);

  const visible =
    tab === "recent"
      ? buckets.recent
      : tab === "favorites"
        ? favoriteEntities
        : tab === "frequent"
          ? buckets.frequent
          : tab === "alpha"
            ? buckets.alphabetical
            : searchResults;

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  function toggleFavorite(id: string) {
    const next = favorites.includes(id) ? favorites.filter((x) => x !== id) : [...favorites, id];
    setFavorites(next);
    saveFavorites(next);
  }

  function handleEntityCreated(entity: CreatedEntityResult) {
    onChange(selectedIds.includes(entity.id) ? selectedIds : [...selectedIds, entity.id]);
    onQuickCreateNameChange("");
    onQuickCreateNotesChange("");
    setCreateOpen(false);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "recent", label: "Recent" },
    { id: "favorites", label: "Favorites" },
    { id: "frequent", label: "Frequent" },
    { id: "search", label: "Search" },
    { id: "alpha", label: "A–Z" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${
              tab === t.id ? "bg-teal-600/25 text-teal-300" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "search" && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={REFERENCE_PICKER.searchPlaceholder}
          className={inputClass}
          autoFocus
        />
      )}

      <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-xl border border-zinc-800 p-1">
        {visible.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-zinc-500">
            {tab === "search" && !query.trim()
              ? REFERENCE_PICKER.typeToSearch
              : tab === "favorites"
                ? REFERENCE_PICKER.starToPin
                : REFERENCE_PICKER.noReferences}
          </p>
        ) : (
          visible.map((entity) => (
            <EntityRow
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

      {selectedIds.length > 0 && (
        <p className="text-xs text-teal-400">
          {REFERENCE_PICKER.selected(
            selectedIds.length,
            selectedIds
              .map((id) => allEntities.find((e) => e.id === id)?.name)
              .filter(Boolean)
              .join(", ")
          )}
        </p>
      )}

      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="text-sm font-medium text-teal-500/90 hover:text-teal-400"
      >
        {REFERENCES.createNew}
      </button>

      <CreateAndLinkModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        buckets={buckets}
        mode="create"
        defaultKind={quickCreateKind}
        allowedKinds={REFERENCE_KINDS}
        linkSource="create"
        onCreated={handleEntityCreated}
      />
    </div>
  );
}
