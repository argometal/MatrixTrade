/**
 * AF03 UI-only repository shapes (§1–3).
 * NOT final ArgusForge persistence / ontology.
 * Folder path is NOT identity — `id` is identity.
 */

export type OperationalView = "active" | "archive";

export type Af03Folder = {
  id: string;
  title: string;
  /** null = root of the operational view */
  parentId: string | null;
  view: OperationalView;
  createdAt: string;
  updatedAt: string;
};

export type Af03ChaosDeck = {
  id: string;
  title: string;
  /** null = root of the operational view */
  folderId: string | null;
  view: OperationalView;
  /** Placeholder count until content ingest (§5–7) exists */
  contentCount: number;
  preview: string;
  createdAt: string;
  updatedAt: string;
};

export type Af03RepoState = {
  version: 1;
  folders: Af03Folder[];
  decks: Af03ChaosDeck[];
};

export const AF03_REPO_STORAGE_KEY = "argusforge-af03-repo-v1";
