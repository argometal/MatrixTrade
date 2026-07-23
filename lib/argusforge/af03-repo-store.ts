/**
 * AF03 browser-local repository store (Active / Archive folders + Chaos Decks).
 * Storage: localStorage — survives refresh, NOT server persistence.
 * Prototype / interim — see AF03 §14 disclosure.
 */

import {
  AF03_REPO_STORAGE_KEY,
  type Af03ChaosDeck,
  type Af03Folder,
  type Af03RepoState,
  type OperationalView,
} from "./af03-repo-types";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function seedState(): Af03RepoState {
  const t = nowIso();
  const notesId = "fld_seed_notes";
  const ideasId = "fld_seed_ideas";
  const archivedOldId = "fld_seed_archived_old";
  return {
    version: 1,
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
        id: "deck_seed_capture",
        title: "Inbox scraps",
        folderId: null,
        view: "active",
        contentCount: 0,
        preview: "Empty deck — ingest comes in later AF03 slices",
        createdAt: t,
        updatedAt: t,
      },
      {
        id: "deck_seed_af",
        title: "ArgusForge decisions",
        folderId: notesId,
        view: "active",
        contentCount: 0,
        preview: "Placeholder Chaos Deck",
        createdAt: t,
        updatedAt: t,
      },
      {
        id: "deck_seed_old",
        title: "Retired experiments",
        folderId: archivedOldId,
        view: "archive",
        contentCount: 0,
        preview: "Archived — not deleted",
        createdAt: t,
        updatedAt: t,
      },
    ],
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
    const parsed = JSON.parse(raw) as Af03RepoState;
    if (parsed.version !== 1 || !Array.isArray(parsed.folders) || !Array.isArray(parsed.decks)) {
      return seedState();
    }
    return parsed;
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

export function folderBreadcrumb(state: Af03RepoState, folderId: string | null): Af03Folder[] {
  const chain: Af03Folder[] = [];
  let current = folderId ? getFolder(state, folderId) : undefined;
  while (current) {
    chain.unshift(current);
    current = current.parentId ? getFolder(state, current.parentId) : undefined;
  }
  return chain;
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
    preview: "New Chaos Deck",
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
