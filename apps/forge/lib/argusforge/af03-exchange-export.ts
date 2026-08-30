/**
 * CHANGE 24-1C — Neutral ArgusForge exchange package export (B0).
 * Assets referenced only — binary ZIP bundle deferred.
 */

import type { Af03ImageBlockPayload, AfExchangePackage } from "./af03-builder-types";
import { listBlocksForFragment } from "./af03-builder-store";
import { getDeck, listItemsInDeck } from "./af03-repo-store";
import type { Af03RepoState } from "./af03-repo-types";

export function buildExchangePackage(
  state: Af03RepoState,
  deckId: string
): AfExchangePackage | null {
  const deck = getDeck(state, deckId);
  if (!deck) return null;

  const fragments = listItemsInDeck(state, deckId);
  const fragmentIds = fragments.map((f) => f.id);
  const blocks = fragments.flatMap((f) => listBlocksForFragment(state, f.id));
  const assetIds = new Set<string>();
  for (const b of blocks) {
    if (b.type === "image") {
      const id = (b.payload as Af03ImageBlockPayload).assetId;
      if (id) assetIds.add(id);
    }
  }
  const assets = (state.assets ?? [])
    .filter((a) => assetIds.has(a.id))
    .map((a) => ({
      id: a.id,
      filename: a.filename,
      mimeType: a.mimeType,
      byteSize: a.byteSize,
      embedded: false as const,
    }));

  // Deterministic ordering for compare-friendly exports
  const sortedFragments = [...fragments].sort((a, b) => a.id.localeCompare(b.id));
  const sortedBlocks = [...blocks].sort(
    (a, b) => a.fragmentId.localeCompare(b.fragmentId) || a.order - b.order || a.id.localeCompare(b.id)
  );
  const sortedAssets = [...assets].sort((a, b) => a.id.localeCompare(b.id));

  return {
    schema: "argusforge.exchange",
    version: 1,
    exportedAt: new Date().toISOString(),
    source: {
      system: "ArgusForge",
      deckId: deck.id,
    },
    realms: [],
    decks: [
      {
        id: deck.id,
        title: deck.title,
        folderId: deck.folderId,
        status: deck.view,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt,
        fragmentIds,
      },
    ],
    fragments: sortedFragments.map((f) => ({
      id: f.id,
      deckId: f.deckId,
      title: f.title,
      blockIds: listBlocksForFragment(state, f.id).map((b) => b.id),
      tags: f.tags ?? [],
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      structuralHints: f.structuralHints ?? null,
    })),
    blocks: sortedBlocks.map((b) => ({
      id: b.id,
      fragmentId: b.fragmentId,
      type: b.type,
      order: b.order,
      payload: b.payload,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    })),
    assets: sortedAssets,
    relations: [],
    reviewConfig: null,
    structuralHints: [],
    binaryBundle: {
      status: "deferred",
      note: "B0 references asset metadata only; ZIP/binary packaging deferred to B1+",
    },
  };
}

export function downloadExchangePackage(pkg: AfExchangePackage): void {
  const json = JSON.stringify(pkg, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `argusforge-exchange-${pkg.source.deckId}-${pkg.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
