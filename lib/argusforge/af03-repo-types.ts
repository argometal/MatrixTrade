/**
 * AF03 UI-only repository shapes (§3–6 / delivery 3–6).
 * NOT final ArgusForge persistence / ontology.
 * Folder path is NOT identity — `id` is identity.
 */

export type OperationalView = "active" | "archive";

export type Af03LayoutMode = "list" | "grid";

export type Af03ContentKind = "text" | "link" | "image" | "file" | "pdf" | "mixed";

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
  contentCount: number;
  preview: string;
  createdAt: string;
  updatedAt: string;
};

export type Af03ContentItem = {
  id: string;
  deckId: string;
  kind: Af03ContentKind;
  title: string;
  /** Text body, URL, markdown, or reference note — not auto-rewritten */
  body: string;
  /** Original source hint when known */
  sourceRef: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  /**
   * True when the item records intent but binary/payload is not fully stored
   * (prototype: do not silently discard — keep a visible stub).
   */
  unsupported: boolean;
  unsupportedReason: string | null;
};

export type Af03RepoPrefs = {
  deckListLayout: Af03LayoutMode;
  deckInternalLayout: Af03LayoutMode;
};

export type Af03RepoState = {
  version: 2;
  folders: Af03Folder[];
  decks: Af03ChaosDeck[];
  items: Af03ContentItem[];
  prefs: Af03RepoPrefs;
};

export const AF03_REPO_STORAGE_KEY = "argusforge-af03-repo-v1";

export const DEFAULT_PREFS: Af03RepoPrefs = {
  deckListLayout: "list",
  deckInternalLayout: "list",
};
