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

/** Exported for Chaos Dumping (24-2E) save transaction. */
export function syncFragmentBodyFromBlocksForDump(
  state: Af03RepoState,
  fragmentId: string
): Af03RepoState {
  return syncFragmentBodyFromBlocks(state, fragmentId);
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

function replaceFragmentBlocks(
  state: Af03RepoState,
  fragmentId: string,
  nextBlocks: Af03Block[]
): Af03RepoState {
  const t = nowIso();
  const others = (state.blocks ?? []).filter((b) => b.fragmentId !== fragmentId);
  const ordered = nextBlocks.map((b, i) => ({ ...b, order: i, updatedAt: t }));
  let next: Af03RepoState = { ...state, blocks: [...others, ...ordered] };
  next = syncFragmentBodyFromBlocks(next, fragmentId);
  writeRepo(next);
  return next;
}

/** Ensure a Fragment has at least one text block (Classic body → block document). */
export function ensureFragmentTextBlock(
  state: Af03RepoState,
  fragmentId: string,
  fallbackBody = ""
): Af03RepoState {
  if (!getItem(state, fragmentId)) return state;
  if (listBlocksForFragment(state, fragmentId).length > 0) return state;
  return addTextBlock(state, fragmentId, fallbackBody)?.state ?? state;
}

export type ImageInsertCaret =
  | {
      textBlockId: string;
      offset: number;
    }
  | {
      afterBlockId: string;
    };

/**
 * Alexandria-style locus body: ordered p / img blocks.
 * Inserting at a text caret splits that paragraph and places the image between.
 */
export async function insertImageBlockFromFile(
  state: Af03RepoState,
  fragmentId: string,
  file: File,
  caret?: ImageInsertCaret | null
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

  const payload: Af03ImageBlockPayload = {
    assetId,
    alt: file.name || "image",
  };
  const imageBlock: Af03Block = {
    id: newStableId("blk"),
    fragmentId,
    type: "image",
    order: 0,
    payload,
    createdAt: t,
    updatedAt: t,
  };

  const list = listBlocksForFragment(state, fragmentId).map((b) => ({ ...b }));
  let insertAt = list.length;

  if (caret && "afterBlockId" in caret) {
    const idx = list.findIndex((b) => b.id === caret.afterBlockId);
    insertAt = idx >= 0 ? idx + 1 : list.length;
  } else if (caret && "textBlockId" in caret) {
    const idx = list.findIndex((b) => b.id === caret.textBlockId);
    const target = idx >= 0 ? list[idx] : undefined;
    if (target && target.type === "text") {
      const text = (target.payload as Af03TextBlockPayload).text ?? "";
      const offset = Math.max(0, Math.min(caret.offset, text.length));
      if (offset <= 0) {
        insertAt = idx;
      } else if (offset >= text.length) {
        insertAt = idx + 1;
      } else {
        const before = text.slice(0, offset);
        const after = text.slice(offset);
        list[idx] = {
          ...target,
          payload: { text: before, formatVersion: 1 } satisfies Af03TextBlockPayload,
          updatedAt: t,
        };
        const afterBlock: Af03Block = {
          id: newStableId("blk"),
          fragmentId,
          type: "text",
          order: 0,
          payload: { text: after, formatVersion: 1 },
          createdAt: t,
          updatedAt: t,
        };
        list.splice(idx + 1, 0, imageBlock, afterBlock);
        insertAt = -1;
      }
    }
  }

  if (insertAt >= 0) {
    list.splice(insertAt, 0, imageBlock);
  }

  let next: Af03RepoState = {
    ...state,
    assets: [...(state.assets ?? []), asset],
  };
  next = replaceFragmentBlocks(next, fragmentId, list);
  return { state: next, block: imageBlock, asset };
}

export async function addImageBlockFromFile(
  state: Af03RepoState,
  fragmentId: string,
  file: File
): Promise<{ state: Af03RepoState; block: Af03Block; asset: Af03AssetMeta } | { error: string }> {
  return insertImageBlockFromFile(state, fragmentId, file);
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

export type RemoveImageResult = {
  state: Af03RepoState;
  mergedTextBlockId: string | null;
  caretOffset: number;
};

/**
 * Inverse of caret-split insert: drop the image and join neighboring
 * text blocks so the document is one paragraph again.
 */
export function removeImageAndMergeParagraphs(
  state: Af03RepoState,
  blockId: string
): RemoveImageResult {
  const existing = (state.blocks ?? []).find((b) => b.id === blockId);
  if (!existing || existing.type !== "image") {
    return { state, mergedTextBlockId: null, caretOffset: 0 };
  }
  const fragmentId = existing.fragmentId;
  const list = listBlocksForFragment(state, fragmentId).map((b) => ({ ...b }));
  const idx = list.findIndex((b) => b.id === blockId);
  if (idx < 0) return { state, mergedTextBlockId: null, caretOffset: 0 };

  const prev = list[idx - 1];
  const next = list[idx + 1];
  list.splice(idx, 1);

  let mergedTextBlockId: string | null = null;
  let caretOffset = 0;

  if (prev?.type === "text" && next?.type === "text") {
    const a = (prev.payload as Af03TextBlockPayload).text ?? "";
    const b = (next.payload as Af03TextBlockPayload).text ?? "";
    caretOffset = a.length;
    const mergedAt = list.findIndex((b) => b.id === prev.id);
    if (mergedAt >= 0) {
      list[mergedAt] = {
        ...prev,
        payload: { text: a + b, formatVersion: 1 } satisfies Af03TextBlockPayload,
      };
      const dropAt = list.findIndex((b) => b.id === next.id);
      if (dropAt >= 0) list.splice(dropAt, 1);
    }
    mergedTextBlockId = prev.id;
  } else if (prev?.type === "text") {
    mergedTextBlockId = prev.id;
    caretOffset = ((prev.payload as Af03TextBlockPayload).text ?? "").length;
  } else if (next?.type === "text") {
    mergedTextBlockId = next.id;
    caretOffset = 0;
  }

  if (list.length === 0) {
    const t = nowIso();
    const empty: Af03Block = {
      id: newStableId("blk"),
      fragmentId,
      type: "text",
      order: 0,
      payload: { text: "", formatVersion: 1 },
      createdAt: t,
      updatedAt: t,
    };
    list.push(empty);
    mergedTextBlockId = empty.id;
    caretOffset = 0;
  }

  return {
    state: replaceFragmentBlocks(state, fragmentId, list),
    mergedTextBlockId,
    caretOffset,
  };
}

export function removeBlock(state: Af03RepoState, blockId: string): Af03RepoState {
  const existing = (state.blocks ?? []).find((b) => b.id === blockId);
  if (!existing) return state;
  if (existing.type === "image") {
    return removeImageAndMergeParagraphs(state, blockId).state;
  }
  let next: Af03RepoState = {
    ...state,
    blocks: (state.blocks ?? []).filter((b) => b.id !== blockId),
  };
  next = syncFragmentBodyFromBlocks(next, existing.fragmentId);
  writeRepo(next);
  return next;
}
