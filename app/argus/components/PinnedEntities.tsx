"use client";

import { useEffect, useState } from "react";
import type { Entity } from "@/lib/argus/types";
import { FAVORITES_KEY } from "@/lib/argus/journal-helpers";
import { CompactEntityRow } from "./CompactRows";

export function PinnedEntities({ entities }: { entities: Entity[] }) {
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      setPinnedIds(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setPinnedIds([]);
    }
  }, []);

  const pinned = pinnedIds
    .map((id) => entities.find((e) => e.id === id))
    .filter((e): e is Entity => Boolean(e));

  if (pinned.length === 0) return null;

  return (
    <section className="mb-5">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">Pinned</h2>
      <div className="rounded-xl border border-zinc-800/80 px-3">
        {pinned.map((entity) => (
          <CompactEntityRow key={entity.id} entity={entity} />
        ))}
      </div>
    </section>
  );
}
