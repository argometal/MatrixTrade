/**
 * CHANGE 24-47 — Canonical visible ontology labels (UI only).
 * Persisted fields may still say folder/item/content internally.
 */

export const AF_LABEL = {
  realm: "Realm",
  folder: "Folder",
  chaosDeck: "Chaos Deck",
  fragment: "Fragment",
  block: "Block",
  realms: "Realms",
  folders: "Folders",
  chaosDecks: "Chaos Decks",
  fragments: "Fragments",
  blocks: "Blocks",
} as const;

export type AfVisibleEntityKind =
  | "realm"
  | "folder"
  | "chaosDeck"
  | "fragment"
  | "block";

export function afLabel(kind: AfVisibleEntityKind): string {
  switch (kind) {
    case "realm":
      return AF_LABEL.realm;
    case "folder":
      return AF_LABEL.folder;
    case "chaosDeck":
      return AF_LABEL.chaosDeck;
    case "fragment":
      return AF_LABEL.fragment;
    case "block":
      return AF_LABEL.block;
  }
}

/** Provisional titles for non-blocking creation (no modal). */
export function provisionalRealmTitle(existingTitles: string[] = []): string {
  return nextProvisional("New Realm", existingTitles);
}

export function provisionalFolderTitle(existingTitles: string[] = []): string {
  return nextProvisional("New Folder", existingTitles);
}

export function provisionalDeckTitle(existingTitles: string[] = []): string {
  return nextProvisional("New Chaos Deck", existingTitles);
}

function nextProvisional(base: string, existing: string[]): string {
  const set = new Set(existing.map((t) => t.trim().toLowerCase()));
  if (!set.has(base.toLowerCase())) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base} ${i}`;
    if (!set.has(candidate.toLowerCase())) return candidate;
  }
  return `${base} ${Date.now()}`;
}

/** Shared dark-mode text role classes (24-47 contrast pass). */
export const AF_TEXT = {
  primary: "text-zinc-100",
  secondary: "text-zinc-300",
  metadata: "text-zinc-400",
  placeholder: "text-zinc-500",
  disabled: "text-zinc-600",
} as const;
