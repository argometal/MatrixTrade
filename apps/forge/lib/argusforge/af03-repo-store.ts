/**
 * AF03 browser-local repository store (folders, Chaos Decks, content items).
 * Storage: localStorage — survives refresh, NOT server persistence.
 * Prototype / interim — see AF03 §14 disclosure.
 * CHANGE 24-1C — version 3 blocks + asset metadata; safe migration (no wipe).
 */

import type { Af03Block } from "./af03-builder-types";
import { newStableId } from "./af03-ids";
import {
  AF03_REPO_STORAGE_KEY,
  DEFAULT_PREFS,
  UNASSIGNED_REALM_ID,
  type Af03ChaosDeck,
  type Af03ContentItem,
  type Af03ContentKind,
  type Af03Folder,
  type Af03LayoutMode,
  type Af03RepoPrefs,
  type Af03RepoState,
  type OperationalView,
} from "./af03-repo-types";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return newStableId(prefix);
}

function previewFromItems(items: Af03ContentItem[]): string {
  if (items.length === 0) return "Empty Chaos Deck";
  const first = [...items].sort((a, b) => a.order - b.order)[0]!;
  const snippet = first.title || first.body.slice(0, 80) || first.kind;
  return snippet;
}

export function syncDeckDerived(state: Af03RepoState, deckId: string): Af03RepoState {
  const deckItems = state.items.filter((i) => i.deckId === deckId);
  const t = nowIso();
  return {
    ...state,
    decks: state.decks.map((d) =>
      d.id === deckId
        ? {
            ...d,
            contentCount: deckItems.length,
            preview: previewFromItems(deckItems),
            updatedAt: t,
          }
        : d
    ),
  };
}

/** Alias used by builder store — same as syncDeckDerived. */
export function syncDeckPreviewFromFragment(
  state: Af03RepoState,
  deckId: string
): Af03RepoState {
  return syncDeckDerived(state, deckId);
}

function seedState(): Af03RepoState {
  const t = nowIso();
  const notesId = "fld_seed_notes";
  const ideasId = "fld_seed_ideas";
  const archivedOldId = "fld_seed_archived_old";
  const captureId = "deck_seed_capture";
  const afId = "deck_seed_af";
  const oldId = "deck_seed_old";

  const welcomeBody =
    "# Capture\n\nPaste thoughts here. Classification is optional.\n\n- raw notes\n- links\n- later: files";
  const linkBody = "https://github.com/argometal/MatrixTrade";

  const items: Af03ContentItem[] = [
    {
      id: "item_seed_welcome",
      deckId: captureId,
      kind: "text",
      title: "Welcome scrap",
      body: welcomeBody,
      sourceRef: null,
      order: 0,
      createdAt: t,
      updatedAt: t,
      unsupported: false,
      unsupportedReason: null,
      markedForLater: false,
      builderMigrated: true,
      tags: [],
      structuralHints: null,
    },
    {
      id: "item_seed_link",
      deckId: afId,
      kind: "link",
      title: "AF03 contract",
      body: linkBody,
      sourceRef: "https://github.com/argometal/MatrixTrade",
      order: 0,
      createdAt: t,
      updatedAt: t,
      unsupported: false,
      unsupportedReason: null,
      markedForLater: false,
      builderMigrated: true,
      tags: [],
      structuralHints: null,
    },
  ];

  const blocks: Af03Block[] = [
    {
      id: "blk_seed_welcome",
      fragmentId: "item_seed_welcome",
      type: "text",
      order: 0,
      payload: { text: welcomeBody, formatVersion: 1 },
      createdAt: t,
      updatedAt: t,
    },
    {
      id: "blk_seed_link",
      fragmentId: "item_seed_link",
      type: "text",
      order: 0,
      payload: { text: linkBody, formatVersion: 1 },
      createdAt: t,
      updatedAt: t,
    },
  ];

  return {
    version: 3,
    folders: [
      {
        id: notesId,
        title: "Notes",
        parentId: null,
        view: "active",
        createdAt: t,
        updatedAt: t,
        lastOpenedAt: null,
        openCount: 0,
      },
      {
        id: ideasId,
        title: "Ideas",
        parentId: notesId,
        view: "active",
        createdAt: t,
        updatedAt: t,
        lastOpenedAt: null,
        openCount: 0,
      },
      {
        id: archivedOldId,
        title: "2025 Review",
        parentId: null,
        view: "archive",
        createdAt: t,
        updatedAt: t,
        lastOpenedAt: null,
        openCount: 0,
      },
    ],
    decks: [
      {
        id: captureId,
        title: "Inbox scraps",
        folderId: null,
        view: "active",
        contentCount: 1,
        preview: "Welcome scrap",
        createdAt: t,
        updatedAt: t,
        lastOpenedAt: null,
        openCount: 0,
      },
      {
        id: afId,
        title: "ArgusForge decisions",
        folderId: notesId,
        view: "active",
        contentCount: 1,
        preview: "AF03 contract",
        createdAt: t,
        updatedAt: t,
        lastOpenedAt: null,
        openCount: 0,
      },
      {
        id: oldId,
        title: "Retired experiments",
        folderId: archivedOldId,
        view: "archive",
        contentCount: 0,
        preview: "Empty Chaos Deck",
        createdAt: t,
        updatedAt: t,
        lastOpenedAt: null,
        openCount: 0,
      },
    ],
    items,
    blocks,
    assets: [],
    prefs: { ...DEFAULT_PREFS },
  };
}

function normalizeFolder(f: Af03Folder): Af03Folder {
  return {
    ...f,
    lastOpenedAt: f.lastOpenedAt ?? null,
    openCount: typeof f.openCount === "number" ? f.openCount : 0,
  };
}

function normalizeDeck(d: Af03ChaosDeck): Af03ChaosDeck {
  return {
    ...d,
    contentCount: d.contentCount ?? 0,
    preview: d.preview || "Empty Chaos Deck",
    lastOpenedAt: d.lastOpenedAt ?? null,
    openCount: typeof d.openCount === "number" ? d.openCount : 0,
  };
}

function normalizeItem(i: Af03ContentItem): Af03ContentItem {
  return {
    ...i,
    markedForLater: Boolean(i.markedForLater),
    builderMigrated: Boolean(i.builderMigrated),
    tags: Array.isArray(i.tags) ? i.tags : [],
    structuralHints: i.structuralHints ?? null,
  };
}

function projectLegacyItemToBlock(item: Af03ContentItem): Af03Block {
  const t = item.createdAt || nowIso();
  return {
    id: newId("blk"),
    fragmentId: item.id,
    type: "text",
    order: 0,
    payload: {
      text: item.body || item.sourceRef || "",
      formatVersion: 1,
    },
    createdAt: t,
    updatedAt: t,
  };
}

/** Idempotent v1/v2/v3 → v3 with blocks. Never clears user data. */
function migrateRepo(raw: unknown): Af03RepoState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.folders) || !Array.isArray(o.decks)) return null;

  const prefs =
    o.prefs && typeof o.prefs === "object"
      ? { ...DEFAULT_PREFS, ...(o.prefs as Af03RepoPrefs) }
      : { ...DEFAULT_PREFS };

  let items: Af03ContentItem[] = [];
  if (o.version === 1) {
    items = [];
  } else if (Array.isArray(o.items)) {
    items = (o.items as Af03ContentItem[]).map(normalizeItem);
  } else {
    return null;
  }

  const existingBlocks = Array.isArray(o.blocks) ? (o.blocks as Af03Block[]) : [];
  const existingAssets = Array.isArray(o.assets) ? o.assets : [];
  const blocksByFragment = new Map<string, Af03Block[]>();
  for (const b of existingBlocks) {
    if (!b || typeof b.id !== "string" || typeof b.fragmentId !== "string") continue;
    const list = blocksByFragment.get(b.fragmentId) ?? [];
    list.push(b);
    blocksByFragment.set(b.fragmentId, list);
  }

  const nextItems: Af03ContentItem[] = [];
  const nextBlocks: Af03Block[] = [];

  for (const item of items) {
    const have = blocksByFragment.get(item.id) ?? [];
    if (item.builderMigrated || have.length > 0) {
      nextItems.push({ ...item, builderMigrated: true });
      nextBlocks.push(...have);
    } else {
      nextBlocks.push(projectLegacyItemToBlock(item));
      nextItems.push({ ...item, builderMigrated: true });
    }
  }

  // Keep orphan blocks that reference unknown fragments (non-destructive)
  const keptIds = new Set(nextBlocks.map((b) => b.id));
  for (const b of existingBlocks) {
    if (b && typeof b.id === "string" && !keptIds.has(b.id)) {
      nextBlocks.push(b);
      keptIds.add(b.id);
    }
  }

  return {
    version: 3,
    folders: (o.folders as Af03Folder[]).map(normalizeFolder),
    decks: (o.decks as Af03ChaosDeck[]).map(normalizeDeck),
    items: nextItems,
    blocks: nextBlocks,
    assets: existingAssets as Af03RepoState["assets"],
    prefs,
  };
}

export function emptyOrSeedRepo(): Af03RepoState {
  if (typeof window === "undefined") return seedState();
  try {
    const raw = localStorage.getItem(AF03_REPO_STORAGE_KEY);
    if (!raw) {
      const seeded = seedState();
      localStorage.setItem(AF03_REPO_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const migrated = migrateRepo(JSON.parse(raw));
    if (!migrated) {
      // Corrupt payload: do not wipe — return seed only for this session, do not overwrite storage
      return seedState();
    }
    writeRepo(migrated);
    return migrated;
  } catch {
    // Do not clear localStorage on parse errors
    return seedState();
  }
}

export function writeRepo(state: Af03RepoState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AF03_REPO_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

export function setPrefs(state: Af03RepoState, patch: Partial<Af03RepoPrefs>): Af03RepoState {
  const next = { ...state, prefs: { ...state.prefs, ...patch } };
  writeRepo(next);
  return next;
}

export function listChildFolders(
  state: Af03RepoState,
  view: OperationalView,
  parentId: string | null
): Af03Folder[] {
  return state.folders
    .filter((f) => f.view === view && f.parentId === parentId)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function listDecksAt(
  state: Af03RepoState,
  view: OperationalView,
  folderId: string | null
): Af03ChaosDeck[] {
  return state.decks
    .filter((d) => d.view === view && d.folderId === folderId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getFolder(state: Af03RepoState, id: string): Af03Folder | undefined {
  return state.folders.find((f) => f.id === id);
}

export function getDeck(state: Af03RepoState, id: string): Af03ChaosDeck | undefined {
  return state.decks.find((d) => d.id === id);
}

export function getItem(state: Af03RepoState, id: string): Af03ContentItem | undefined {
  return state.items.find((i) => i.id === id);
}

export function listItemsInDeck(state: Af03RepoState, deckId: string): Af03ContentItem[] {
  return state.items
    .filter((i) => i.deckId === deckId)
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

export function folderBreadcrumb(state: Af03RepoState, folderId: string | null): Af03Folder[] {
  const chain: Af03Folder[] = [];
  let current = folderId ? getFolder(state, folderId) : undefined;
  while (current) {
    chain.unshift(current);
    current = current.parentId ? getFolder(state, current.parentId) : undefined;
  }
  return chain;
}

export function deckHref(deckId: string): string {
  return `/forge/deck/${deckId}`;
}

/** CHANGE 24-0F — record Realm open (folders only; Unassigned is synthetic). */
export function recordRealmOpen(state: Af03RepoState, realmId: string): Af03RepoState {
  if (realmId === UNASSIGNED_REALM_ID) return state;
  const t = nowIso();
  const next = {
    ...state,
    folders: state.folders.map((f) =>
      f.id === realmId
        ? { ...f, lastOpenedAt: t, openCount: (f.openCount ?? 0) + 1, updatedAt: f.updatedAt }
        : f
    ),
  };
  writeRepo(next);
  return next;
}

/** CHANGE 24-0F — record Chaos Deck open for provisional freshness. */
export function recordDeckOpen(state: Af03RepoState, deckId: string): Af03RepoState {
  const t = nowIso();
  const next = {
    ...state,
    decks: state.decks.map((d) =>
      d.id === deckId
        ? { ...d, lastOpenedAt: t, openCount: (d.openCount ?? 0) + 1 }
        : d
    ),
  };
  writeRepo(next);
  return next;
}

export function itemHref(deckId: string, itemId: string): string {
  return `/forge/deck/${deckId}/item/${itemId}`;
}

export function viewHref(deckId: string, itemId: string): string {
  return `/forge/deck/${deckId}/item/${itemId}/view`;
}

export function deckStatus(deck: Af03ChaosDeck): "archived" | "empty" | "active" {
  if (deck.view === "archive") return "archived";
  if (deck.contentCount === 0) return "empty";
  return "active";
}

export function restoreDeck(state: Af03RepoState, id: string): Af03RepoState {
  const t = nowIso();
  const next = {
    ...state,
    decks: state.decks.map((d) =>
      d.id === id ? { ...d, view: "active" as const, updatedAt: t } : d
    ),
  };
  writeRepo(next);
  return next;
}

export function createFolder(
  state: Af03RepoState,
  input: { title: string; parentId: string | null; view: OperationalView }
): { state: Af03RepoState; folder: Af03Folder } {
  const t = nowIso();
  const folder: Af03Folder = {
    id: newId("fld"),
    title: input.title.trim() || "Untitled Realm",
    parentId: input.parentId,
    view: input.view,
    createdAt: t,
    updatedAt: t,
    lastOpenedAt: null,
    openCount: 0,
  };
  const next = { ...state, folders: [...state.folders, folder] };
  writeRepo(next);
  return { state: next, folder };
}

export function createDeck(
  state: Af03RepoState,
  input: { title: string; folderId: string | null; view: OperationalView }
): { state: Af03RepoState; deck: Af03ChaosDeck } {
  const t = nowIso();
  const deck: Af03ChaosDeck = {
    id: newId("deck"),
    title: input.title.trim() || "Untitled Chaos Deck",
    folderId: input.folderId,
    view: input.view,
    contentCount: 0,
    preview: "Empty Chaos Deck",
    createdAt: t,
    updatedAt: t,
    lastOpenedAt: null,
    openCount: 0,
  };
  const next = { ...state, decks: [...state.decks, deck] };
  writeRepo(next);
  return { state: next, deck };
}

export function renameFolder(state: Af03RepoState, id: string, title: string): Af03RepoState {
  const t = nowIso();
  const next = {
    ...state,
    folders: state.folders.map((f) =>
      f.id === id ? { ...f, title: title.trim() || f.title, updatedAt: t } : f
    ),
  };
  writeRepo(next);
  return next;
}

export function renameDeck(state: Af03RepoState, id: string, title: string): Af03RepoState {
  const t = nowIso();
  const next = {
    ...state,
    decks: state.decks.map((d) =>
      d.id === id ? { ...d, title: title.trim() || d.title, updatedAt: t } : d
    ),
  };
  writeRepo(next);
  return next;
}

/** Move a folder subtree + its decks into Archive (preserve, not delete). */
export function archiveFolder(state: Af03RepoState, id: string): Af03RepoState {
  const t = nowIso();
  const toArchive = new Set<string>();
  const walk = (fid: string) => {
    toArchive.add(fid);
    state.folders.filter((f) => f.parentId === fid).forEach((f) => walk(f.id));
  };
  walk(id);
  const next: Af03RepoState = {
    ...state,
    folders: state.folders.map((f) =>
      toArchive.has(f.id) ? { ...f, view: "archive", updatedAt: t } : f
    ),
    decks: state.decks.map((d) =>
      d.folderId && toArchive.has(d.folderId)
        ? { ...d, view: "archive", updatedAt: t }
        : d
    ),
  };
  writeRepo(next);
  return next;
}

export function archiveDeck(state: Af03RepoState, id: string): Af03RepoState {
  const t = nowIso();
  const next = {
    ...state,
    decks: state.decks.map((d) =>
      d.id === id ? { ...d, view: "archive" as const, folderId: null, updatedAt: t } : d
    ),
  };
  writeRepo(next);
  return next;
}

/**
 * Move a Chaos Deck into a Realm folder (or Unassigned when folderId is null).
 * View follows the target folder (or stays Active for Unassigned).
 */
export function moveDeckToFolder(
  state: Af03RepoState,
  deckId: string,
  folderId: string | null
): Af03RepoState {
  const deck = getDeck(state, deckId);
  if (!deck) return state;

  let nextView: OperationalView = "active";
  if (folderId) {
    const folder = getFolder(state, folderId);
    if (!folder) return state;
    nextView = folder.view;
  }

  if (deck.folderId === folderId && deck.view === nextView) return state;

  const t = nowIso();
  const next: Af03RepoState = {
    ...state,
    decks: state.decks.map((d) =>
      d.id === deckId
        ? {
            ...d,
            folderId,
            view: nextView,
            updatedAt: t,
          }
        : d
    ),
  };
  writeRepo(next);
  return next;
}

/**
 * Move a fragment (content item) into another Chaos Deck.
 * Syncs contentCount/preview on both source and target decks.
 */
export function moveFragmentToDeck(
  state: Af03RepoState,
  itemId: string,
  targetDeckId: string
): Af03RepoState {
  const item = state.items.find((i) => i.id === itemId);
  const target = getDeck(state, targetDeckId);
  if (!item || !target) return state;
  if (item.deckId === targetDeckId) return state;

  const sourceDeckId = item.deckId;
  const siblings = listItemsInDeck(state, targetDeckId);
  const nextOrder =
    siblings.length === 0 ? 0 : Math.max(...siblings.map((s) => s.order)) + 1;
  const t = nowIso();

  let next: Af03RepoState = {
    ...state,
    items: state.items.map((i) =>
      i.id === itemId ? { ...i, deckId: targetDeckId, order: nextOrder, updatedAt: t } : i
    ),
  };
  next = syncDeckDerived(next, sourceDeckId);
  next = syncDeckDerived(next, targetDeckId);
  writeRepo(next);
  return next;
}

export function createContent(
  state: Af03RepoState,
  input: {
    deckId: string;
    kind: Af03ContentKind;
    title: string;
    body: string;
    sourceRef?: string | null;
    unsupported?: boolean;
    unsupportedReason?: string | null;
  }
): { state: Af03RepoState; item: Af03ContentItem } {
  const siblings = listItemsInDeck(state, input.deckId);
  const t = nowIso();
  const item: Af03ContentItem = {
    id: newId("item"),
    deckId: input.deckId,
    kind: input.kind,
    title: input.title.trim() || defaultTitle(input.kind),
    body: input.body,
    sourceRef: input.sourceRef ?? null,
    order: siblings.length === 0 ? 0 : Math.max(...siblings.map((s) => s.order)) + 1,
    createdAt: t,
    updatedAt: t,
    unsupported: Boolean(input.unsupported),
    unsupportedReason: input.unsupportedReason ?? null,
    markedForLater: false,
    builderMigrated: true,
    tags: [],
    structuralHints: null,
  };
  const block: Af03Block = {
    id: newId("blk"),
    fragmentId: item.id,
    type: "text",
    order: 0,
    payload: { text: input.body || input.sourceRef || "", formatVersion: 1 },
    createdAt: t,
    updatedAt: t,
  };
  let next: Af03RepoState = {
    ...state,
    items: [...state.items, item],
    blocks: [...(state.blocks ?? []), block],
    assets: state.assets ?? [],
  };
  next = syncDeckDerived(next, input.deckId);
  writeRepo(next);
  return { state: next, item };
}

function defaultTitle(kind: Af03ContentKind): string {
  switch (kind) {
    case "link":
      return "Untitled link";
    case "image":
      return "Image";
    case "file":
      return "File reference";
    case "pdf":
      return "PDF reference";
    case "mixed":
      return "Mixed content";
    default:
      return "Untitled note";
  }
}

export function updateContent(
  state: Af03RepoState,
  id: string,
  patch: Partial<Pick<Af03ContentItem, "title" | "body" | "kind" | "sourceRef" | "markedForLater">>
): Af03RepoState {
  const existing = getItem(state, id);
  if (!existing) return state;
  const t = nowIso();
  let next: Af03RepoState = {
    ...state,
    items: state.items.map((i) =>
      i.id === id
        ? {
            ...i,
            ...patch,
            title: patch.title !== undefined ? patch.title.trim() || i.title : i.title,
            updatedAt: t,
          }
        : i
    ),
  };
  next = syncDeckDerived(next, existing.deckId);
  writeRepo(next);
  return next;
}

export function removeContent(state: Af03RepoState, id: string): Af03RepoState {
  const existing = getItem(state, id);
  if (!existing) return state;
  let next: Af03RepoState = {
    ...state,
    items: state.items.filter((i) => i.id !== id),
    blocks: (state.blocks ?? []).filter((b) => b.fragmentId !== id),
    assets: state.assets ?? [],
  };
  next = syncDeckDerived(next, existing.deckId);
  writeRepo(next);
  return next;
}

/**
 * Permanently delete a Chaos Deck and its Fragments/Blocks.
 * Asset blobs in IndexedDB are left for later GC (metadata refs drop with blocks).
 */
export function deleteDeck(state: Af03RepoState, deckId: string): Af03RepoState {
  const deck = getDeck(state, deckId);
  if (!deck) return state;
  const fragmentIds = new Set(
    state.items.filter((i) => i.deckId === deckId).map((i) => i.id)
  );
  const next: Af03RepoState = {
    ...state,
    decks: state.decks.filter((d) => d.id !== deckId),
    items: state.items.filter((i) => i.deckId !== deckId),
    blocks: (state.blocks ?? []).filter((b) => !fragmentIds.has(b.fragmentId)),
    assets: state.assets ?? [],
  };
  writeRepo(next);
  return next;
}

/**
 * Permanently delete a Realm (folder) subtree: child Realms, Decks, Fragments, Blocks.
 */
export function deleteFolder(state: Af03RepoState, folderId: string): Af03RepoState {
  if (!getFolder(state, folderId)) return state;
  const folderIds = new Set<string>();
  const walk = (fid: string) => {
    folderIds.add(fid);
    state.folders.filter((f) => f.parentId === fid).forEach((f) => walk(f.id));
  };
  walk(folderId);

  const deckIds = new Set(
    state.decks
      .filter((d) => d.folderId != null && folderIds.has(d.folderId))
      .map((d) => d.id)
  );
  const fragmentIds = new Set(
    state.items.filter((i) => deckIds.has(i.deckId)).map((i) => i.id)
  );

  const next: Af03RepoState = {
    ...state,
    folders: state.folders.filter((f) => !folderIds.has(f.id)),
    decks: state.decks.filter((d) => !deckIds.has(d.id)),
    items: state.items.filter((i) => !fragmentIds.has(i.id)),
    blocks: (state.blocks ?? []).filter((b) => !fragmentIds.has(b.fragmentId)),
    assets: state.assets ?? [],
  };
  writeRepo(next);
  return next;
}

export function moveContentOrder(
  state: Af03RepoState,
  id: string,
  direction: "up" | "down"
): Af03RepoState {
  const existing = getItem(state, id);
  if (!existing) return state;
  const list = listItemsInDeck(state, existing.deckId);
  const idx = list.findIndex((i) => i.id === id);
  if (idx < 0) return state;
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= list.length) return state;
  const a = list[idx]!;
  const b = list[swapWith]!;
  const nextItems = state.items.map((i) => {
    if (i.id === a.id) return { ...i, order: b.order, updatedAt: nowIso() };
    if (i.id === b.id) return { ...i, order: a.order, updatedAt: nowIso() };
    return i;
  });
  let next: Af03RepoState = { ...state, items: nextItems };
  next = syncDeckDerived(next, existing.deckId);
  writeRepo(next);
  return next;
}

export function levelStats(
  state: Af03RepoState,
  view: OperationalView,
  folderId: string | null
): { folders: number; decks: number; lastModified: string | null } {
  const folders = listChildFolders(state, view, folderId);
  const decks = listDecksAt(state, view, folderId);
  const dates = [...folders.map((f) => f.updatedAt), ...decks.map((d) => d.updatedAt)];
  dates.sort();
  return {
    folders: folders.length,
    decks: decks.length,
    lastModified: dates.length ? dates[dates.length - 1]! : null,
  };
}

/** Direct-child snapshot for Active/Archive summary bars — real counts only, no due/grades. */
export function levelSnapshot(
  state: Af03RepoState,
  view: OperationalView,
  folderId: string | null
): {
  folders: number;
  decks: number;
  items: number;
  blocks: number;
  emptyDecks: number;
  fresh: number;
  older: number;
  recentItems: number;
  archivedDecksGlobal: number;
} {
  const folders = listChildFolders(state, view, folderId);
  const decks = listDecksAt(state, view, folderId);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const items = decks.reduce((n, d) => n + d.contentCount, 0);
  const emptyDecks = decks.filter((d) => d.contentCount === 0).length;
  const entities = [
    ...folders.map((f) => f.updatedAt),
    ...decks.map((d) => d.updatedAt),
  ];
  const fresh = entities.filter((iso) => new Date(iso).getTime() >= weekAgo).length;
  const older = entities.length - fresh;
  const deckIds = new Set(decks.map((d) => d.id));
  const recentItems = state.items.filter(
    (i) => deckIds.has(i.deckId) && new Date(i.createdAt).getTime() >= weekAgo
  ).length;
  return {
    folders: folders.length,
    decks: decks.length,
    items,
    blocks: state.blocks.filter((b) => {
      const item = state.items.find((i) => i.id === b.fragmentId);
      return Boolean(item && deckIds.has(item.deckId));
    }).length,
    emptyDecks,
    fresh,
    older,
    recentItems,
    archivedDecksGlobal: archivedDeckCount(state),
  };
}

/** Direct children under a folder (for list-row metadata). */
export function folderRowMeta(
  state: Af03RepoState,
  folderId: string
): { childFolders: number; decks: number; items: number; recentItems: number } {
  const folder = getFolder(state, folderId);
  if (!folder) return { childFolders: 0, decks: 0, items: 0, recentItems: 0 };
  const childFolders = listChildFolders(state, folder.view, folderId).length;
  const decks = listDecksAt(state, folder.view, folderId);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const items = decks.reduce((n, d) => n + d.contentCount, 0);
  const recentItems = state.items.filter((i) => {
    const deck = getDeck(state, i.deckId);
    return (
      deck &&
      deck.folderId === folderId &&
      deck.view === folder.view &&
      new Date(i.createdAt).getTime() >= weekAgo
    );
  }).length;
  return { childFolders, decks: decks.length, items, recentItems };
}

export function deckRowMeta(
  state: Af03RepoState,
  deckId: string
): { items: number; recentItems: number } {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const items = listItemsInDeck(state, deckId);
  return {
    items: items.length,
    recentItems: items.filter((i) => new Date(i.createdAt).getTime() >= weekAgo).length,
  };
}

export function formatRelativeAgo(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "—";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 365) return `${days}d ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function duplicateContent(
  state: Af03RepoState,
  id: string
): { state: Af03RepoState; item: Af03ContentItem } | null {
  const existing = getItem(state, id);
  if (!existing) return null;
  const created = createContent(state, {
    deckId: existing.deckId,
    kind: existing.kind,
    title: `${existing.title} (copy)`,
    body: existing.body,
    sourceRef: existing.sourceRef,
    unsupported: existing.unsupported,
    unsupportedReason: existing.unsupportedReason,
  });
  // createContent already added one text block; replace with copies of source blocks when richer
  const sourceBlocks = (created.state.blocks ?? [])
    .filter((b) => b.fragmentId === existing.id)
    .sort((a, b) => a.order - b.order);
  if (sourceBlocks.length === 0) return created;
  const t = nowIso();
  const withoutAuto = (created.state.blocks ?? []).filter((b) => b.fragmentId !== created.item.id);
  const copied: Af03Block[] = sourceBlocks.map((b, idx) => ({
    ...b,
    id: newId("blk"),
    fragmentId: created.item.id,
    order: idx,
    createdAt: t,
    updatedAt: t,
  }));
  const next: Af03RepoState = {
    ...created.state,
    blocks: [...withoutAuto, ...copied],
  };
  writeRepo(next);
  return { state: next, item: created.item };
}

export function setMarkedForLater(
  state: Af03RepoState,
  id: string,
  marked: boolean
): Af03RepoState {
  return updateContent(state, id, { markedForLater: marked });
}

export function deckStats(
  state: Af03RepoState,
  deckId: string
): {
  items: number;
  text: number;
  links: number;
  images: number;
  stubs: number;
  recent: number;
  markedLater: number;
  lastModified: string | null;
} {
  const items = listItemsInDeck(state, deckId);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const dates = items.map((i) => i.updatedAt);
  dates.sort();
  return {
    items: items.length,
    text: items.filter((i) => i.kind === "text" || i.kind === "mixed").length,
    links: items.filter((i) => i.kind === "link").length,
    images: items.filter((i) => i.kind === "image").length,
    stubs: items.filter((i) => i.unsupported).length,
    recent: items.filter((i) => new Date(i.createdAt).getTime() >= weekAgo).length,
    markedLater: items.filter((i) => i.markedForLater).length,
    lastModified: dates.length ? dates[dates.length - 1]! : null,
  };
}

/** Global archived deck count — truthful stored data only. */
export function archivedDeckCount(state: Af03RepoState): number {
  return state.decks.filter((d) => d.view === "archive").length;
}

/** Global home dashboard counts — real stored data only (no due/grades/SRS). */
export function homeOverview(state: Af03RepoState): {
  folders: number;
  decks: number;
  activeDecks: number;
  archivedDecks: number;
  items: number;
  recentItems: number;
  markedLater: number;
  stubs: number;
  text: number;
  links: number;
  images: number;
  lastModified: string | null;
  recentDecks: Af03ChaosDeck[];
} {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const activeDecks = state.decks.filter((d) => d.view === "active");
  const archivedDecks = state.decks.filter((d) => d.view === "archive");
  const dates = [
    ...state.folders.map((f) => f.updatedAt),
    ...state.decks.map((d) => d.updatedAt),
    ...state.items.map((i) => i.updatedAt),
  ].sort();
  const recentDecks = [...state.decks]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);
  return {
    folders: state.folders.length,
    decks: state.decks.length,
    activeDecks: activeDecks.length,
    archivedDecks: archivedDecks.length,
    items: state.items.length,
    recentItems: state.items.filter((i) => new Date(i.createdAt).getTime() >= weekAgo).length,
    markedLater: state.items.filter((i) => i.markedForLater).length,
    stubs: state.items.filter((i) => i.unsupported).length,
    text: state.items.filter((i) => i.kind === "text" || i.kind === "mixed").length,
    links: state.items.filter((i) => i.kind === "link").length,
    images: state.items.filter((i) => i.kind === "image").length,
    lastModified: dates.length ? dates[dates.length - 1]! : null,
    recentDecks,
  };
}

export function setDeckListLayout(state: Af03RepoState, layout: Af03LayoutMode): Af03RepoState {
  return setPrefs(state, { deckListLayout: layout });
}

export function setDeckInternalLayout(state: Af03RepoState, layout: Af03LayoutMode): Af03RepoState {
  return setPrefs(state, { deckInternalLayout: layout });
}
