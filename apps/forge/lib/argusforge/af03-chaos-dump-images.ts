/**
 * CHANGE 24-2E — Chaos Dumping image ingestion helpers.
 * Reuses AF03 Chaos IndexedDB asset store (24-1C). No localStorage binaries.
 */

import type { Af03AssetMeta, Af03Block, Af03ImageBlockPayload } from "./af03-builder-types";
import {
  chaosAssetsAvailability,
  deleteAsset,
  getAsset,
  putAsset,
} from "./af03-chaos-assets-idb";
import { looksLikeUrl, titleFromDump } from "./af03-chaos-dump";
import { newStableId } from "./af03-ids";
import { listBlocksForFragment, syncFragmentBodyFromBlocksForDump } from "./af03-builder-store";
import {
  getItem,
  listItemsInDeck,
  syncDeckPreviewFromFragment,
  writeRepo,
} from "./af03-repo-store";
import type { Af03ContentItem, Af03ContentKind, Af03RepoState } from "./af03-repo-types";

export const CHAOS_DUMP_MAX_IMAGE_COUNT = 10;
export const CHAOS_DUMP_MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export type ChaosDraftImage = {
  draftId: string;
  file: File;
  previewUrl: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  status: "ready" | "saving" | "error";
  error?: string;
};

export type ChaosDumpImageErrorCode =
  | "unsupported_type"
  | "file_too_large"
  | "too_many_images"
  | "empty_file"
  | "storage_unavailable"
  | "persistence_failure"
  | "empty_capture";

export type ChaosDumpImageError = {
  code: ChaosDumpImageErrorCode;
  message: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

export function createDraftImage(file: File): ChaosDraftImage {
  return {
    draftId: newStableId("draft"),
    file,
    previewUrl: URL.createObjectURL(file),
    filename: file.name || "image",
    mimeType: file.type || "application/octet-stream",
    byteSize: file.size,
    status: "ready",
  };
}

export function revokeDraftImage(draft: ChaosDraftImage): void {
  try {
    URL.revokeObjectURL(draft.previewUrl);
  } catch {
    /* ignore */
  }
}

export function revokeAllDraftImages(drafts: ChaosDraftImage[]): void {
  for (const d of drafts) revokeDraftImage(d);
}

/** Validate a single file before accepting into the draft. */
export function validateImageFile(
  file: File,
  currentCount: number
): ChaosDumpImageError | null {
  if (!file.type.startsWith("image/")) {
    return {
      code: "unsupported_type",
      message: `Unsupported type: ${file.name || "file"} (images only).`,
    };
  }
  if (file.size <= 0) {
    return {
      code: "empty_file",
      message: `Empty or corrupt file: ${file.name || "file"}.`,
    };
  }
  if (file.size > CHAOS_DUMP_MAX_IMAGE_BYTES) {
    return {
      code: "file_too_large",
      message: `${file.name || "Image"} exceeds ${Math.round(CHAOS_DUMP_MAX_IMAGE_BYTES / (1024 * 1024))} MB.`,
    };
  }
  if (currentCount >= CHAOS_DUMP_MAX_IMAGE_COUNT) {
    return {
      code: "too_many_images",
      message: `At most ${CHAOS_DUMP_MAX_IMAGE_COUNT} images per capture.`,
    };
  }
  return null;
}

/** Append files to draft; returns next drafts + first compact error (if any rejects). */
export function appendImageFilesToDraft(
  existing: ChaosDraftImage[],
  files: File[]
): { drafts: ChaosDraftImage[]; error: ChaosDumpImageError | null } {
  const next = [...existing];
  let error: ChaosDumpImageError | null = null;
  for (const file of files) {
    const err = validateImageFile(file, next.length);
    if (err) {
      error = err;
      continue;
    }
    next.push(createDraftImage(file));
  }
  return { drafts: next, error };
}

/** Extract image Files from a clipboard paste event. */
export function extractImagesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) return [];
  const out: File[] = [];
  const items = data.items;
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      if (item.kind !== "file") continue;
      if (!item.type.startsWith("image/")) continue;
      const file = item.getAsFile();
      if (file) out.push(file);
    }
  }
  if (out.length === 0 && data.files?.length) {
    for (let i = 0; i < data.files.length; i++) {
      const f = data.files[i]!;
      if (f.type.startsWith("image/")) out.push(f);
    }
  }
  return out;
}

/** Extract image Files from a drop event; also report if non-images were present. */
export function extractImagesFromDrop(data: DataTransfer | null): {
  images: File[];
  rejectedNonImages: number;
} {
  if (!data?.files?.length) return { images: [], rejectedNonImages: 0 };
  const images: File[] = [];
  let rejectedNonImages = 0;
  for (let i = 0; i < data.files.length; i++) {
    const f = data.files[i]!;
    if (f.type.startsWith("image/")) images.push(f);
    else rejectedNonImages += 1;
  }
  return { images, rejectedNonImages };
}

export function isValidChaosDumpCapture(text: string, imageCount: number): boolean {
  return text.trim().length > 0 || imageCount > 0;
}

export function resolveDumpKind(text: string, imageCount: number): Af03ContentKind {
  const trimmed = text.trim();
  const hasText = trimmed.length > 0;
  const hasImages = imageCount > 0;
  if (hasImages && hasText) return "mixed";
  if (hasImages) return "image";
  if (hasText && looksLikeUrl(trimmed)) return "link";
  return "text";
}

export function resolveDumpTitle(text: string, images: ChaosDraftImage[]): string {
  const trimmed = text.trim();
  if (trimmed) return titleFromDump(trimmed);
  if (images[0]?.filename) {
    const name = images[0].filename.replace(/\.[^.]+$/, "") || images[0].filename;
    return name.length > 72 ? `${name.slice(0, 72)}…` : name;
  }
  return "Image";
}


export type PersistDumpResult =
  | {
      ok: true;
      state: Af03RepoState;
      item: Af03ContentItem;
      assetIds: string[];
    }
  | {
      ok: false;
      error: ChaosDumpImageError;
    };

/**
 * One logical save: validate → persist blobs → create fragment + blocks + asset metas.
 * Clears nothing in the UI — caller clears draft only after ok.
 *
 * Optional `deps` are for tests (simulate asset write failure without IndexedDB).
 */
export type PersistChaosDumpDeps = {
  putAssetFn?: typeof putAsset;
  availabilityFn?: typeof chaosAssetsAvailability;
  deleteAssetFn?: typeof deleteAsset;
};

export async function persistChaosDumpCapture(
  state: Af03RepoState,
  input: {
    deckId: string;
    text: string;
    images: ChaosDraftImage[];
  },
  deps?: PersistChaosDumpDeps
): Promise<PersistDumpResult> {
  const putAssetFn = deps?.putAssetFn ?? putAsset;
  const availabilityFn = deps?.availabilityFn ?? chaosAssetsAvailability;
  const deleteAssetFn = deps?.deleteAssetFn ?? deleteAsset;

  const trimmed = input.text.trim();
  if (!isValidChaosDumpCapture(trimmed, input.images.length)) {
    return {
      ok: false,
      error: {
        code: "empty_capture",
        message: "Add text or at least one image before saving to Chaos.",
      },
    };
  }

  if (input.images.length > CHAOS_DUMP_MAX_IMAGE_COUNT) {
    return {
      ok: false,
      error: {
        code: "too_many_images",
        message: `At most ${CHAOS_DUMP_MAX_IMAGE_COUNT} images per capture.`,
      },
    };
  }

  for (let i = 0; i < input.images.length; i++) {
    const img = input.images[i]!;
    const err = validateImageFile(img.file, i);
    if (err) return { ok: false, error: err };
  }

  if (input.images.length > 0) {
    const avail = availabilityFn();
    if (!avail.ok) {
      return {
        ok: false,
        error: {
          code: "storage_unavailable",
          message: avail.reason,
        },
      };
    }
  }

  const writtenIds: string[] = [];
  const assetMetas: Af03AssetMeta[] = [];
  const t = nowIso();

  async function cleanupOrphansLocal(assetIds: string[]): Promise<void> {
    for (const id of assetIds) {
      try {
        await deleteAssetFn(id);
      } catch {
        /* best-effort */
      }
    }
  }

  try {
    for (const img of input.images) {
      const assetId = newStableId("asset");
      await putAssetFn(assetId, img.file, {
        mimeType: img.mimeType,
        filename: img.filename,
        createdAt: t,
      });
      writtenIds.push(assetId);
      assetMetas.push({
        id: assetId,
        mimeType: img.mimeType,
        filename: img.filename,
        byteSize: img.byteSize,
        createdAt: t,
      });
    }
  } catch (e) {
    await cleanupOrphansLocal(writtenIds);
    return {
      ok: false,
      error: {
        code: "persistence_failure",
        message:
          e instanceof Error
            ? `Could not store images: ${e.message}`
            : "Could not store images (IndexedDB failure).",
      },
    };
  }

  const kind = resolveDumpKind(trimmed, input.images.length);
  const title = resolveDumpTitle(trimmed, input.images);
  const siblings = listItemsInDeck(state, input.deckId);
  const item: Af03ContentItem = {
    id: newStableId("item"),
    deckId: input.deckId,
    kind,
    title,
    body: trimmed,
    sourceRef: kind === "link" ? trimmed : null,
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

  const blocks: Af03Block[] = [];
  let order = 0;
  if (trimmed.length > 0 || input.images.length === 0) {
    if (trimmed.length > 0) {
      blocks.push({
        id: newStableId("blk"),
        fragmentId: item.id,
        type: "text",
        order: order++,
        payload: { text: trimmed, formatVersion: 1 },
        createdAt: t,
        updatedAt: t,
      });
    }
  }
  for (let i = 0; i < writtenIds.length; i++) {
    const assetId = writtenIds[i]!;
    const meta = assetMetas[i]!;
    const payload: Af03ImageBlockPayload = {
      assetId,
      alt: meta.filename,
    };
    blocks.push({
      id: newStableId("blk"),
      fragmentId: item.id,
      type: "image",
      order: order++,
      payload,
      createdAt: t,
      updatedAt: t,
    });
  }

  try {
    let next: Af03RepoState = {
      ...state,
      items: [...state.items, item],
      blocks: [...(state.blocks ?? []), ...blocks],
      assets: [...(state.assets ?? []), ...assetMetas],
    };
    next = syncFragmentBodyFromBlocksForDump(next, item.id);
    next = syncDeckPreviewFromFragment(next, input.deckId);
    writeRepo(next);
    return { ok: true, state: next, item, assetIds: writtenIds };
  } catch (e) {
    await cleanupOrphansLocal(writtenIds);
    return {
      ok: false,
      error: {
        code: "persistence_failure",
        message:
          e instanceof Error
            ? `Could not save capture: ${e.message}`
            : "Could not save capture.",
      },
    };
  }
}

/** Asset IDs exclusively referenced by this fragment's image blocks. */
export function exclusiveAssetIdsForFragment(
  state: Af03RepoState,
  fragmentId: string
): string[] {
  const mine = new Set<string>();
  for (const b of listBlocksForFragment(state, fragmentId)) {
    if (b.type !== "image") continue;
    const id = (b.payload as Af03ImageBlockPayload).assetId;
    if (id) mine.add(id);
  }
  const shared = new Set<string>();
  for (const b of state.blocks ?? []) {
    if (b.fragmentId === fragmentId) continue;
    if (b.type !== "image") continue;
    const id = (b.payload as Af03ImageBlockPayload).assetId;
    if (id && mine.has(id)) shared.add(id);
  }
  return [...mine].filter((id) => !shared.has(id));
}

/**
 * Undo a dump capture: remove fragment + exclusive assets (meta + IDB).
 * Returns restored draft image Files when blobs can be re-hydrated.
 */
export async function undoChaosDumpCapture(
  state: Af03RepoState,
  itemId: string
): Promise<{
  state: Af03RepoState;
  restoredText: string;
  restoredImages: ChaosDraftImage[];
}> {
  const item = getItem(state, itemId);
  if (!item) {
    return { state, restoredText: "", restoredImages: [] };
  }
  const restoredText = item.body;
  const assetIds = exclusiveAssetIdsForFragment(state, itemId);
  const restoredImages: ChaosDraftImage[] = [];

  for (const assetId of assetIds) {
    try {
      const row = await getAsset(assetId);
      if (!row) continue;
      const meta = (state.assets ?? []).find((a) => a.id === assetId);
      const file = new File([row.blob], meta?.filename || row.filename || "image", {
        type: meta?.mimeType || row.mimeType || "image/*",
      });
      restoredImages.push(createDraftImage(file));
    } catch {
      /* skip restore for this asset */
    }
  }

  const deckId = item.deckId;
  let next: Af03RepoState = {
    ...state,
    items: state.items.filter((i) => i.id !== itemId),
    blocks: (state.blocks ?? []).filter((b) => b.fragmentId !== itemId),
    assets: (state.assets ?? []).filter((a) => !assetIds.includes(a.id)),
  };
  next = syncDeckPreviewFromFragment(next, deckId);
  writeRepo(next);

  for (const assetId of assetIds) {
    try {
      await deleteAsset(assetId);
    } catch {
      /* best-effort — avoid silent orphans when possible */
    }
  }

  return { state: next, restoredText, restoredImages };
}
