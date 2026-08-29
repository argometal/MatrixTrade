/**
 * CHANGE 24-47 — Entity location path (Realm / Folder / Deck / Fragment).
 * Modes (Viewer/Builder/Classic) are not ancestors.
 */

import { homeExplorerHref } from "./af03-home-explorer";
import { deckHref, folderBreadcrumb, getDeck, getItem, itemHref, viewHref } from "./af03-repo-store";
import type { Af03RepoState } from "./af03-repo-types";
import { AF_LABEL } from "./af03-visible-ontology";

export type EntityPathCrumb = {
  id: string | null;
  title: string;
  href: string | null;
  kind: "home" | "realm" | "folder" | "chaosDeck" | "fragment";
};

export function entityPathForDeck(
  state: Af03RepoState,
  deckId: string
): EntityPathCrumb[] {
  const deck = getDeck(state, deckId);
  const crumbs: EntityPathCrumb[] = [
    { id: null, title: "Explorer", href: "/forge", kind: "home" },
  ];
  if (!deck) {
    crumbs.push({
      id: deckId,
      title: AF_LABEL.chaosDeck,
      href: null,
      kind: "chaosDeck",
    });
    return crumbs;
  }
  if (deck.folderId) {
    const chain = folderBreadcrumb(state, deck.folderId);
    for (const f of chain) {
      crumbs.push({
        id: f.id,
        title: f.title,
        href: homeExplorerHref({ realmId: f.id }),
        kind: f.parentId ? "folder" : "realm",
      });
    }
  }
  crumbs.push({
    id: deck.id,
    title: deck.title,
    href: deckHref(deck.id),
    kind: "chaosDeck",
  });
  return crumbs;
}

export function entityPathForFragment(
  state: Af03RepoState,
  deckId: string,
  fragmentId: string
): EntityPathCrumb[] {
  const crumbs = entityPathForDeck(state, deckId);
  const item = getItem(state, fragmentId);
  crumbs.push({
    id: fragmentId,
    title: item?.title?.trim() || AF_LABEL.fragment,
    href: viewHref(deckId, fragmentId),
    kind: "fragment",
  });
  return crumbs;
}

export type FragmentEditorMode = "viewer" | "classic" | "builder";

export function fragmentModeHref(
  deckId: string,
  fragmentId: string,
  mode: FragmentEditorMode
): string {
  if (mode === "viewer") return viewHref(deckId, fragmentId);
  if (mode === "classic") return `${itemHref(deckId, fragmentId)}?legacy=1`;
  return itemHref(deckId, fragmentId);
}
