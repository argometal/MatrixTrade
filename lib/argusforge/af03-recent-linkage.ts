/**
 * CHANGE 24-33 / 24-36 — Recent linkage rows for Argus Treemap (derived, no new store).
 * 24-36: Fragment-level vs Deck-level relation semantics (no overstatement).
 */

import type { Af03ImageBlockPayload } from "./af03-builder-types";
import { listBlocksForFragment } from "./af03-builder-store";
import { findChaosInboxId } from "./af03-chaos-dump";
import { getFolder, getDeck } from "./af03-repo-store";
import type { Af03ContentItem, Af03ContentKind, Af03RepoState } from "./af03-repo-types";
import type { ArgusGraphState } from "./argus-graph-types";

export type RecentLinkageStatus =
  | "unlinked"
  | "in_realm"
  | "in_related_deck"
  | "related";

export type RecentLinkageRow = {
  fragmentId: string;
  deckId: string;
  title: string;
  preview: string;
  kind: Af03ContentKind;
  deckTitle: string;
  realmTitle: string | null;
  createdAt: string;
  /** Relations that touch a unit with chaosItemId === fragmentId. */
  fragmentRelationCount: number;
  /** Relations that touch a unit with chaosDeckId === deckId. */
  deckRelationCount: number;
  status: RecentLinkageStatus;
  /** First image asset id when present (24-1C blocks). */
  imageAssetId: string | null;
  isInbox: boolean;
};

export const RECENT_LINKAGE_LIMIT = 5;

/** Compact relative time for linkage rows (e.g. 4m, 1h). */
export function formatLinkageTime(iso: string, nowMs = Date.now()): string {
  const ms = nowMs - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "now";
  if (ms < 45_000) return "now";
  if (ms < 3_600_000) return `${Math.max(1, Math.round(ms / 60_000))}m`;
  if (ms < 86_400_000) return `${Math.max(1, Math.round(ms / 3_600_000))}h`;
  const days = Math.round(ms / 86_400_000);
  if (days < 365) return `${days}d`;
  return `${Math.floor(days / 365)}y`;
}

function previewFromItem(item: Af03ContentItem): string {
  const title = item.title.trim();
  const body = item.body.trim().replace(/\s+/g, " ");
  if (title && title !== "Untitled note" && title !== "Untitled dump" && title !== "Image") {
    return title;
  }
  if (body) return body.length > 72 ? `${body.slice(0, 72)}…` : body;
  return title || "Untitled fragment";
}

function firstImageAssetId(
  state: Af03RepoState,
  fragmentId: string
): string | null {
  for (const b of listBlocksForFragment(state, fragmentId)) {
    if (b.type !== "image") continue;
    const id = (b.payload as Af03ImageBlockPayload).assetId;
    if (id) return id;
  }
  return null;
}

function countUniqueRelationsForUnits(
  graph: ArgusGraphState,
  unitIds: Set<string>
): number {
  if (unitIds.size === 0) return 0;
  const seen = new Set<string>();
  for (const r of graph.relations) {
    if (unitIds.has(r.sourceUnitId) || unitIds.has(r.targetUnitId)) {
      seen.add(r.id);
    }
  }
  return seen.size;
}

/**
 * Relations that reference a unit whose chaosItemId === fragmentId.
 * Unique relation IDs — both endpoints matching still count once.
 */
export function countFragmentRelations(
  graph: ArgusGraphState | null,
  fragmentId: string
): number {
  if (!graph) return 0;
  const unitIds = new Set<string>();
  for (const u of graph.units) {
    if (u.chaosItemId === fragmentId) unitIds.add(u.id);
  }
  return countUniqueRelationsForUnits(graph, unitIds);
}

/**
 * Relations that reference a unit associated with the parent Deck
 * (chaosDeckId === deckId). Unique relation IDs.
 */
export function countDeckRelations(
  graph: ArgusGraphState | null,
  deckId: string
): number {
  if (!graph) return 0;
  const unitIds = new Set<string>();
  for (const u of graph.units) {
    if (u.chaosDeckId === deckId) unitIds.add(u.id);
  }
  return countUniqueRelationsForUnits(graph, unitIds);
}

/**
 * Four-state projection. Status follows actual linkage, not location alone.
 * Deck relation never implies direct Fragment relation.
 */
export function deriveRecentLinkageStatus(input: {
  fragmentRelationCount: number;
  deckRelationCount: number;
  hasRealm: boolean;
}): RecentLinkageStatus {
  if (input.fragmentRelationCount > 0) return "related";
  if (input.deckRelationCount > 0) return "in_related_deck";
  if (input.hasRealm) return "in_realm";
  return "unlinked";
}

/** @deprecated Prefer deriveRecentLinkageStatus — kept for transitional imports. */
export function deriveLinkageStatus(input: {
  fragmentRelationCount?: number;
  deckRelationCount?: number;
  relationCount?: number;
  realmTitle?: string | null;
  hasRealm?: boolean;
}): RecentLinkageStatus {
  return deriveRecentLinkageStatus({
    fragmentRelationCount: input.fragmentRelationCount ?? input.relationCount ?? 0,
    deckRelationCount: input.deckRelationCount ?? 0,
    hasRealm: input.hasRealm ?? Boolean(input.realmTitle),
  });
}

export function listRecentLinkageRows(
  state: Af03RepoState,
  graph: ArgusGraphState | null,
  limit = RECENT_LINKAGE_LIMIT
): RecentLinkageRow[] {
  const inboxId = findChaosInboxId(state);
  const items = [...state.items].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  const rows: RecentLinkageRow[] = [];

  for (const item of items) {
    if (rows.length >= limit) break;
    const deck = getDeck(state, item.deckId);
    if (!deck) continue;

    const isInbox = Boolean(inboxId && deck.id === inboxId);
    const folder = deck.folderId ? getFolder(state, deck.folderId) : undefined;
    const realmTitle = folder?.title ?? null;
    // Chaos Inbox is never Realm membership for status (findChaosInboxId, not title alone).
    const hasRealm = Boolean(!isInbox && deck.folderId && folder);
    const fragmentRelationCount = countFragmentRelations(graph, item.id);
    const deckRelationCount = countDeckRelations(graph, deck.id);
    const status = deriveRecentLinkageStatus({
      fragmentRelationCount,
      deckRelationCount,
      hasRealm,
    });

    rows.push({
      fragmentId: item.id,
      deckId: deck.id,
      title: previewFromItem(item),
      preview: item.body.trim().slice(0, 120),
      kind: item.kind,
      deckTitle: isInbox ? "Chaos Inbox" : deck.title,
      realmTitle,
      createdAt: item.createdAt,
      fragmentRelationCount,
      deckRelationCount,
      status,
      imageAssetId: firstImageAssetId(state, item.id),
      isInbox,
    });
  }

  return rows;
}

export function linkageStatusLabel(
  status: RecentLinkageStatus,
  fragmentRelationCount = 0
): string {
  if (status === "related") {
    return fragmentRelationCount === 1
      ? "Related · 1 relation"
      : `Related · ${fragmentRelationCount} relations`;
  }
  if (status === "in_related_deck") return "In related Deck";
  if (status === "in_realm") return "In Realm";
  return "Unlinked";
}
