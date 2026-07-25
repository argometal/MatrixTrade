/**
 * CHANGE 24-1C — Chaos Fragment block operations (B0).
 */

import type {
  Af03AssetMeta,
  Af03Block,
  Af03ImageBlockPayload,
  Af03TextBlockPayload,
} from "./af03-builder-types";
import { putAsset } from "./af03-chaos-assets-idb";
import { newStableId } from "./af03-ids";
import {
  getItem,
  listItemsInDeck,
  syncDeckPreviewFromFragment,
  writeRepo,
} from "./af03-repo-store";
import type { Af03ContentItem, Af03RepoState } from "./af03-repo-types";

function nowIso(): string {
  return new Date().toISOString();
}

export function listBlocksForFragment(state: Af03RepoState, fragmentId: string): Af03Block[] {
  return (state.blocks ?? [])
    .filter((b) => b.fragmentId === fragmentId)
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

export function getAssetMeta(state: Af03RepoState, assetId: string): Af03AssetMeta | undefined {
  return (state.assets ?? []).find((a) => a.id === assetId);
}

function syncFragmentBodyFromBlocks(
  state: Af03RepoState,
  fragmentId: string
): Af03RepoState {
  const blocks = listBlocksForFragment(state, fragmentId);
  const textParts: string[] = [];
  let kind: Af03ContentItem["kind"] = "text";
  let hasImage = false;
  let hasText = false;
  for (const b of blocks) {
    if (b.type === "text") {
      hasText = true;
      textParts.push((b.payload as Af03TextBlockPayload).text || "");
    } else if (b.type === "image") {
      hasImage = true;
    }
  }
  if (hasImage && hasText) kind = "mixed";
  else if (hasImage) kind = "image";
  else kind = "text";

  const body = textParts.join("\n\n");
  const t = nowIso();
  const items = state.items.map((i) =>
    i.id === fragmentId
      ? {
          ...i,
          kind,
          body,
          updatedAt: t,
          builderMigrated: true,
        }
      : i
  );
  let next: Af03RepoState = { ...state, items };
  const item = getItem(next, fragmentId);
  if (item) {
    next = syncDeckPreviewFromFragment(next, item.deckId);
  }
  return next;
}

/** Exported for store coupling — updates deck preview after fragment body sync. */
export function touchDeck(state: Af03RepoState, deckId: string): Af03RepoState {
  return syncDeckPreviewFromFragment(state, deckId);
}

export function createFragment(
  state: Af03RepoState,
  deckId: string,
  title?: string
): { state: Af03RepoState; fragment: Af03ContentItem } {
  const siblings = listItemsInDeck(state, deckId);
  const t = nowIso();
  const fragment: Af03ContentItem = {
    id: newStableId("item"),
    deckId,
    kind: "text",
    title: (title ?? "").trim() || "Untitled fragment",
    body: "",
    sourceRef: null,
    order: siblings.length === 0 ? 0 : Math.max(...siblings.map((s) => s.order)) + 1,
    createdAt: t,
    updatedAt: t,
    unsupported: false,
    unsupportedReason: null,
    markedForLater: false,
    builderMigrated: true,
    tags: [],
    structuralHints: null,
  };
  let next: Af03RepoState = {
    ...state,
    items: [...state.items, fragment],
    blocks: state.blocks ?? [],
    assets: state.assets ?? [],
  };
  next = syncDeckPreviewFromFragment(next, deckId);
  writeRepo(next);
  return { state: next, fragment };
}

export function addTextBlock(
  state: Af03RepoState,
  fragmentId: string,
  text = ""
): { state: Af03RepoState; block: Af03Block } | null {
  if (!getItem(state, fragmentId)) return null;
  const siblings = listBlocksForFragment(state, fragmentId);
  const t = nowIso();
  const block: Af03Block = {
    id: newStableId("blk"),
    fragmentId,
    type: "text",
    order: siblings.length === 0 ? 0 : Math.max(...siblings.map((s) => s.order)) + 1,
    payload: { text, formatVersion: 1 },
    createdAt: t,
    updatedAt: t,
  };
  let next: Af03RepoState = {
    ...state,
    blocks: [...(state.blocks ?? []), block],
    assets: state.assets ?? [],
  };
  next = syncFragmentBodyFromBlocks(next, fragmentId);
  writeRepo(next);
  return { state: next, block };
}

export function updateTextBlock(
  state: Af03RepoState,
  blockId: string,
  text: string
): Af03RepoState {
  const existing = (state.blocks ?? []).find((b) => b.id === blockId);
  if (!existing || existing.type !== "text") return state;
  const t = nowIso();
  let next: Af03RepoState = {
    ...state,
    blocks: (state.blocks ?? []).map((b) =>
      b.id === blockId
        ? {
            ...b,
            payload: { text, formatVersion: 1 } satisfies Af03TextBlockPayload,
            updatedAt: t,
          }
        : b
    ),
  };
  next = syncFragmentBodyFromBlocks(next, existing.fragmentId);
  writeRepo(next);
  return next;
}

export async function addImageBlockFromFile(
  state: Af03RepoState,
  fragmentId: string,
  file: File
): Promise<{ state: Af03RepoState; block: Af03Block; asset: Af03AssetMeta } | { error: string }> {
  if (!getItem(state, fragmentId)) return { error: "Fragment not found" };
  if (!file.type.startsWith("image/")) return { error: "File must be an image" };

  const assetId = newStableId("asset");
  const t = nowIso();
  try {
    await putAsset(assetId, file, {
      mimeType: file.type || "application/octet-stream",
      filename: file.name || "image",
      createdAt: t,
    });
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? `IndexedDB error — text kept; image not stored: ${e.message}`
          : "IndexedDB error — image not stored",
    };
  }

  const asset: Af03AssetMeta = {
    id: assetId,
    mimeType: file.type || "application/octet-stream",
    filename: file.name || "image",
    byteSize: file.size,
    createdAt: t,
  };

  const siblings = listBlocksForFragment(state, fragmentId);
  const payload: Af03ImageBlockPayload = {
    assetId,
    alt: file.name || "image",
  };
  const block: Af03Block = {
    id: newStableId("blk"),
    fragmentId,
    type: "image",
    order: siblings.length === 0 ? 0 : Math.max(...siblings.map((s) => s.order)) + 1,
    payload,
    createdAt: t,
    updatedAt: t,
  };

  let next: Af03RepoState = {
    ...state,
    blocks: [...(state.blocks ?? []), block],
    assets: [...(state.assets ?? []), asset],
  };
  next = syncFragmentBodyFromBlocks(next, fragmentId);
  writeRepo(next);
  return { state: next, block, asset };
}

export function moveBlockOrder(
  state: Af03RepoState,
  blockId: string,
  direction: "up" | "down"
): Af03RepoState {
  const existing = (state.blocks ?? []).find((b) => b.id === blockId);
  if (!existing) return state;
  const list = listBlocksForFragment(state, existing.fragmentId);
  const idx = list.findIndex((b) => b.id === blockId);
  if (idx < 0) return state;
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= list.length) return state;
  const a = list[idx]!;
  const b = list[swapWith]!;
  const t = nowIso();
  let next: Af03RepoState = {
    ...state,
    blocks: (state.blocks ?? []).map((blk) => {
      if (blk.id === a.id) return { ...blk, order: b.order, updatedAt: t };
      if (blk.id === b.id) return { ...blk, order: a.order, updatedAt: t };
      return blk;
    }),
  };
  next = syncFragmentBodyFromBlocks(next, existing.fragmentId);
  writeRepo(next);
  return next;
}

export function removeBlock(state: Af03RepoState, blockId: string): Af03RepoState {
  const existing = (state.blocks ?? []).find((b) => b.id === blockId);
  if (!existing) return state;
  // Asset blob cleanup deferred — metadata retained if unreferenced cleanup not run
  let next: Af03RepoState = {
    ...state,
    blocks: (state.blocks ?? []).filter((b) => b.id !== blockId),
  };
  next = syncFragmentBodyFromBlocks(next, existing.fragmentId);
  writeRepo(next);
  return next;
}
