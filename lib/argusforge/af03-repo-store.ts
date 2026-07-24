/**
 * AF03 browser-local repository store (folders, Chaos Decks, content items).
 * Storage: localStorage — survives refresh, NOT server persistence.
 * Prototype / interim — see AF03 §14 disclosure.
 */

import {
  AF03_REPO_STORAGE_KEY,
  DEFAULT_PREFS,
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
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function previewFromItems(items: Af03ContentItem[]): string {
  if (items.length === 0) return "Empty Chaos Deck";
  const first = [...items].sort((a, b) => a.order - b.order)[0]!;
  const snippet = first.title || first.body.slice(0, 80) || first.kind;
  return snippet;
}

function syncDeckDerived(state: Af03RepoState, deckId: string): Af03RepoState {
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

function seedState(): Af03RepoState {
  const t = nowIso();
  const notesId = "fld_seed_notes";
  const ideasId = "fld_seed_ideas";
  const archivedOldId = "fld_seed_archived_old";
  const captureId = "deck_seed_capture";
  const afId = "deck_seed_af";
  const oldId = "deck_seed_old";

  const items: Af03ContentItem[] = [
    {
      id: "item_seed_welcome",
      deckId: captureId,
      kind: "text",
      title: "Welcome scrap",
      body: "# Capture\n\nPaste thoughts here. Classification is optional.\n\n- raw notes\n- links\n- later: files",
      sourceRef: null,
      order: 0,
      createdAt: t,
      updatedAt: t,
      unsupported: false,
      unsupportedReason: null,
      markedForLater: false,
    },
    {
      id: "item_seed_link",
      deckId: afId,
      kind: "link",
      title: "AF03 contract",
      body: "https://github.com/argometal/MatrixTrade",
      sourceRef: "https://github.com/argometal/MatrixTrade",
      order: 0,
      createdAt: t,
      updatedAt: t,
      unsupported: false,
      unsupportedReason: null,
      markedForLater: false,
    },
  ];

  return {
    version: 2,
    folders: [
      {
        id: notesId,
        title: "Notes",
        parentId: null,
        view: "active",
        createdAt: t,
        updatedAt: t,
      },
      {
        id: ideasId,
        title: "Ideas",
        parentId: notesId,
        view: "active",
        createdAt: t,
        updatedAt: t,
      },
      {
        id: archivedOldId,
        title: "2025 Review",
        parentId: null,
        view: "archive",
        createdAt: t,
        updatedAt: t,
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
      },
    ],
    items,
    prefs: { ...DEFAULT_PREFS },
  };
}

function migrateToV2(raw: unknown): Af03RepoState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.folders) || !Array.isArray(o.decks)) return null;

  if (o.version === 2 && Array.isArray(o.items)) {
    const prefs =
      o.prefs && typeof o.prefs === "object"
        ? { ...DEFAULT_PREFS, ...(o.prefs as Af03RepoPrefs) }
        : { ...DEFAULT_PREFS };
    const items = (o.items as Af03ContentItem[]).map((i) => ({
      ...i,
      markedForLater: Boolean(i.markedForLater),
    }));
    return {
      version: 2,
      folders: o.folders as Af03Folder[],
      decks: o.decks as Af03ChaosDeck[],
      items,
      prefs,
    };
  }

  if (o.version === 1) {
    const decks = o.decks as Af03ChaosDeck[];
    return {
      version: 2,
      folders: o.folders as Af03Folder[],
      decks: decks.map((d) => ({
        ...d,
        contentCount: d.contentCount ?? 0,
        preview: d.preview || "Empty Chaos Deck",
      })),
      items: [],
      prefs: { ...DEFAULT_PREFS },
    };
  }

  return null;
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
    const migrated = migrateToV2(JSON.parse(raw));
    if (!migrated) return seedState();
    writeRepo(migrated);
    return migrated;
  } catch {
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
    title: input.title.trim() || "Untitled folder",
    parentId: input.parentId,
    view: input.view,
    createdAt: t,
    updatedAt: t,
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
  };
  let next: Af03RepoState = { ...state, items: [...state.items, item] };
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
  };
  next = syncDeckDerived(next, existing.deckId);
  writeRepo(next);
  return next;
}

/** Move a fragment (content item) into another Chaos Deck. Reorders to end of target. */
export function moveContentToDeck(
  state: Af03RepoState,
  itemId: string,
  targetDeckId: string
): Af03RepoState {
  const existing = getItem(state, itemId);
  const target = getDeck(state, targetDeckId);
  if (!existing || !target || existing.deckId === targetDeckId) return state;
  const fromId = existing.deckId;
  const siblings = listItemsInDeck(state, targetDeckId);
  const t = nowIso();
  const order = siblings.length === 0 ? 0 : Math.max(...siblings.map((s) => s.order)) + 1;
  let next: Af03RepoState = {
    ...state,
    items: state.items.map((i) =>
      i.id === itemId ? { ...i, deckId: targetDeckId, order, updatedAt: t } : i
    ),
  };
  next = syncDeckDerived(next, fromId);
  next = syncDeckDerived(next, targetDeckId);
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
  return createContent(state, {
    deckId: existing.deckId,
    kind: existing.kind,
    title: `${existing.title} (copy)`,
    body: existing.body,
    sourceRef: existing.sourceRef,
    unsupported: existing.unsupported,
    unsupportedReason: existing.unsupportedReason,
  });
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
