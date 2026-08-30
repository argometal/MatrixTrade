/**
 * CHANGE 24-1C — Chaos progressive builder B0 types.
 * AF-owned model. Not Alexandria ORM / domain classes.
 */

export type Af03BlockType = "text" | "image";

export type Af03TextBlockPayload = {
  text: string;
  formatVersion: 1;
};

export type Af03ImageBlockPayload = {
  assetId: string;
  caption?: string;
  alt?: string;
  fit?: "contain" | "cover";
};

export type Af03BlockPayload = Af03TextBlockPayload | Af03ImageBlockPayload;

export type Af03Block = {
  id: string;
  fragmentId: string;
  type: Af03BlockType;
  order: number;
  payload: Af03BlockPayload;
  createdAt: string;
  updatedAt: string;
};

export type Af03AssetMeta = {
  id: string;
  mimeType: string;
  filename: string;
  byteSize: number;
  createdAt: string;
  checksum?: string;
};

/** Optional exchange-domain hints — unused by B0 UI. */
export type Af03StructuralHints = {
  candidateRealmId?: string | null;
  candidateParcourId?: string | null;
  candidateCastleId?: string | null;
  candidateLocusId?: string | null;
  spatialRole?: string | null;
  reviewRole?: string | null;
};

export const AF03_CHAOS_ASSETS_DB = "argusforge-chaos-assets-v1";
export const AF03_CHAOS_ASSETS_STORE = "assets";

/** Neutral exchange package — B0 foundation. */
export type AfExchangePackage = {
  schema: "argusforge.exchange";
  version: 1;
  exportedAt: string;
  source: {
    system: "ArgusForge";
    deckId: string;
  };
  realms: unknown[];
  decks: Array<{
    id: string;
    title: string;
    folderId: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
    fragmentIds: string[];
  }>;
  fragments: Array<{
    id: string;
    deckId: string;
    title: string;
    blockIds: string[];
    tags: string[];
    createdAt: string;
    updatedAt: string;
    structuralHints: Af03StructuralHints | null;
  }>;
  blocks: Array<{
    id: string;
    fragmentId: string;
    type: Af03BlockType;
    order: number;
    payload: Af03BlockPayload;
    createdAt: string;
    updatedAt: string;
  }>;
  assets: Array<{
    id: string;
    filename: string;
    mimeType: string;
    byteSize: number;
    embedded: false;
  }>;
  relations: unknown[];
  reviewConfig: null;
  structuralHints: Af03StructuralHints[];
  /** B0: ZIP/binary bundle deferred */
  binaryBundle: {
    status: "deferred";
    note: string;
  };
};

export type AfResultRating = "good" | "medium" | "fail";

/** Neutral result contract — types only in B0 (no import UI). */
export type AfResultPackage = {
  schema: "argusforge.result";
  version: 1;
  sourceRuntime: string;
  sourceVersion: string;
  sessionId: string;
  deckId: string;
  fragmentId?: string | null;
  realmId?: string | null;
  parcourId?: string | null;
  castleId?: string | null;
  locusId?: string | null;
  startedAt: string;
  completedAt: string;
  rating: AfResultRating;
  hintUsed: boolean;
  elapsedMs: number;
  navigationErrors: number;
  assetErrors: number;
  schedulerBefore?: unknown;
  schedulerAfter?: unknown;
  notes?: string;
};
