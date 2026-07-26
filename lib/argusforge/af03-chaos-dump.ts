/**
 * CHANGE 24-22 — Chaos Dumping helpers (Inbox destination + last dest memory).
 */

import type { Af03ChaosDeck, Af03RepoState } from "./af03-repo-types";
import { createDeck, renameDeck } from "./af03-repo-store";

export const CHAOS_INBOX_TITLE = "Chaos Inbox";
export const CHAOS_DUMP_DEST_KEY = "argusforge-chaos-dump-dest-v1";

const SEED_INBOX_SCRAPS_ID = "deck_seed_capture";

export function ensureChaosInbox(state: Af03RepoState): {
  state: Af03RepoState;
  deckId: string;
} {
  const byTitle = state.decks.find(
    (d) => d.title === CHAOS_INBOX_TITLE && d.view === "active"
  );
  if (byTitle) return { state, deckId: byTitle.id };

  const scraps = state.decks.find(
    (d) => d.id === SEED_INBOX_SCRAPS_ID || d.title === "Inbox scraps"
  );
  if (scraps) {
    const next = renameDeck(state, scraps.id, CHAOS_INBOX_TITLE);
    return { state: next, deckId: scraps.id };
  }

  const { state: next, deck } = createDeck(state, {
    title: CHAOS_INBOX_TITLE,
    folderId: null,
    view: "active",
  });
  return { state: next, deckId: deck.id };
}

export function findChaosInboxId(state: Af03RepoState): string | null {
  const byTitle = state.decks.find(
    (d) => d.title === CHAOS_INBOX_TITLE && d.view === "active"
  );
  if (byTitle) return byTitle.id;
  const scraps = state.decks.find(
    (d) => d.id === SEED_INBOX_SCRAPS_ID || d.title === "Inbox scraps"
  );
  return scraps?.id ?? null;
}

/** Read-only destination list (no repo writes). */
export function listDumpDestinations(
  state: Af03RepoState
): Array<{ id: string; title: string; isInbox: boolean }> {
  const inboxId = findChaosInboxId(state);
  const decks = state.decks
    .filter((d) => d.view === "active")
    .sort((a, b) => {
      if (inboxId && a.id === inboxId) return -1;
      if (inboxId && b.id === inboxId) return 1;
      return a.title.localeCompare(b.title);
    });
  return decks.map((d) => ({
    id: d.id,
    title: inboxId && d.id === inboxId ? CHAOS_INBOX_TITLE : d.title,
    isInbox: Boolean(inboxId && d.id === inboxId),
  }));
}

export function readLastDumpDestination(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CHAOS_DUMP_DEST_KEY);
    return raw?.trim() || null;
  } catch {
    return null;
  }
}

export function writeLastDumpDestination(deckId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAOS_DUMP_DEST_KEY, deckId);
  } catch {
    /* ignore */
  }
}

export function resolveDumpDestination(
  state: Af03RepoState,
  preferredId: string | null
): { state: Af03RepoState; deckId: string; deck: Af03ChaosDeck } {
  const ensured = ensureChaosInbox(state);
  let next = ensured.state;
  const inboxId = ensured.deckId;
  const pick =
    (preferredId && next.decks.find((d) => d.id === preferredId && d.view === "active")?.id) ||
    inboxId;
  const deck = next.decks.find((d) => d.id === pick)!;
  return { state: next, deckId: pick, deck };
}

export function titleFromDump(body: string): string {
  const line =
    body
      .trim()
      .split(/\r?\n/)
      .find((part) => part.trim().length > 0)
      ?.trim() ?? "";
  if (!line) return "Untitled dump";
  return line.length > 72 ? `${line.slice(0, 72)}…` : line;
}

export function looksLikeUrl(text: string): boolean {
  const t = text.trim();
  if (!/^https?:\/\/\S+$/i.test(t)) return false;
  try {
    // eslint-disable-next-line no-new
    new URL(t);
    return true;
  } catch {
    return false;
  }
}

export function formatDumpRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "Just now";
  if (ms < 45_000) return "Just now";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}
