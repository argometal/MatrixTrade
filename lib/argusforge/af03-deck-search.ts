/**
 * CHANGE 24-39 — Chaos Deck full-content search (literal, not semantic).
 * Searches the entire Deck, not only what is on screen.
 */

import type {
  Af03ImageBlockPayload,
  Af03TextBlockPayload,
} from "./af03-builder-types";
import { getAssetMeta, listBlocksForFragment } from "./af03-builder-store";
import { listItemsInDeck } from "./af03-repo-store";
import type { Af03ContentItem, Af03RepoState } from "./af03-repo-types";

/** Build a lowercase haystack from title, body, blocks, links, filenames, tags. */
export function fragmentSearchHaystack(
  state: Af03RepoState,
  item: Af03ContentItem
): string {
  const parts: string[] = [
    item.title ?? "",
    item.body ?? "",
    item.sourceRef ?? "",
    item.unsupportedReason ?? "",
    item.kind ?? "",
  ];

  if (item.tags?.length) {
    parts.push(...item.tags);
  }

  for (const block of listBlocksForFragment(state, item.id)) {
    if (block.type === "text") {
      parts.push((block.payload as Af03TextBlockPayload).text ?? "");
    } else if (block.type === "image") {
      const payload = block.payload as Af03ImageBlockPayload;
      parts.push(payload.caption ?? "", payload.alt ?? "", payload.assetId ?? "");
      const meta = getAssetMeta(state, payload.assetId);
      if (meta) {
        parts.push(meta.filename ?? "", meta.mimeType ?? "");
      }
    }
  }

  return parts.join("\n").toLowerCase();
}

export function fragmentMatchesQuery(
  state: Af03RepoState,
  item: Af03ContentItem,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fragmentSearchHaystack(state, item).includes(q);
}

/** Filter all fragments in the Deck by literal query. Empty query → full deck. */
export function filterDeckItems(
  state: Af03RepoState,
  deckId: string,
  query: string
): Af03ContentItem[] {
  const items = listItemsInDeck(state, deckId);
  const q = query.trim();
  if (!q) return items;
  return items.filter((item) => fragmentMatchesQuery(state, item, q));
}

/** Title for cards: prefer real title, else first useful body line. */
export function fragmentDisplayTitle(item: Af03ContentItem): string {
  const title = (item.title ?? "").trim();
  const placeholders = new Set([
    "Untitled note",
    "Untitled fragment",
    "Untitled dump",
    "Untitled link",
    "Image",
    "Mixed content",
  ]);
  if (title && !placeholders.has(title)) return title;

  const line =
    (item.body ?? "")
      .trim()
      .split(/\r?\n/)
      .find((part) => part.trim().length > 0)
      ?.trim() ?? "";
  if (line) return line.length > 80 ? `${line.slice(0, 80)}…` : line;
  if (item.sourceRef?.trim()) return item.sourceRef.trim();
  return title || "Untitled note";
}

/** Multi-line preview for grid cards (3–6 lines worth of text). */
export function fragmentPreviewText(item: Af03ContentItem, maxChars = 220): string {
  const body = (item.body ?? "").trim().replace(/\s+\n/g, "\n");
  if (body) {
    return body.length > maxChars ? `${body.slice(0, maxChars).trimEnd()}…` : body;
  }
  if (item.sourceRef?.trim()) return item.sourceRef.trim();
  return "";
}

/** First image asset id on a fragment (for grid thumbnails). */
export function fragmentFirstImageAssetId(
  state: Af03RepoState,
  fragmentId: string
): string | null {
  for (const block of listBlocksForFragment(state, fragmentId)) {
    if (block.type !== "image") continue;
    const id = (block.payload as Af03ImageBlockPayload).assetId;
    if (id) return id;
  }
  return null;
}
