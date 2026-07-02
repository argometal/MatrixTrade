"use client";

import { useEffect, useMemo, useState } from "react";
import type { Entity } from "@/lib/argus/types";
import { ENTITY_TYPE_LABELS } from "@/lib/argus/labels";
import { FAVORITES_KEY } from "@/lib/argus/journal-helpers";
import { inputClass } from "./ui";

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

export function EntityPicker({ buckets, selectedIds, onChange, onValidityChange }: EntityPickerProps) {
  const [tab, setTab] = useState<Tab>("recent");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());
  const [showCreate, setShowCreate] = useState(false);
  const [quickCreateName, setQuickCreateName] = useState("");

  useEffect(() => {
    onValidityChange?.(selectedIds.length > 0 || quickCreateName.trim().length > 0);
  }, [selectedIds, quickCreateName, onValidityChange]);

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
        e.type.toLowerCase().includes(q)
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
          placeholder="Search by name, type, notes..."
          className={inputClass}
          autoFocus
        />
      )}

      <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-xl border border-zinc-800 p-1">
        {visible.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-zinc-500">
            {tab === "search" && !query.trim()
              ? "Type to search entities"
              : tab === "favorites"
                ? "Star entities to pin them here"
                : "No entities yet"}
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
          {selectedIds.length} selected ·{" "}
          {selectedIds
            .map((id) => allEntities.find((e) => e.id === id)?.name)
            .filter(Boolean)
            .join(", ")}
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowCreate((v) => !v)}
        className="text-sm text-zinc-400 underline hover:text-zinc-200"
      >
        {showCreate ? "Hide quick create" : "+ Quick create entity"}
      </button>

      {showCreate && (
        <div className="space-y-3 rounded-xl border border-zinc-800 p-3">
          <input
            name="newEntityName"
            className={inputClass}
            placeholder="Name"
            value={quickCreateName}
            onChange={(e) => setQuickCreateName(e.target.value)}
          />
          <select name="newEntityType" className={inputClass} defaultValue="person">
            <option value="person">Person</option>
            <option value="company">Company</option>
            <option value="project">Project</option>
            <option value="other">Other</option>
          </select>
          <input name="newEntityNotes" className={inputClass} placeholder="Notes (optional)" />
        </div>
      )}

      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="entityIds" value={id} />
      ))}
    </div>
  );
}
