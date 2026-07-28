/**
 * CHANGE 24-47 — consolidation helpers (ontology, path, provisional names).
 * Run: npx tsx tools/test-argusforge-24-47.ts
 * Or: npm run test:argusforge-24-47
 */
import assert from "node:assert/strict";
import {
  entityPathForDeck,
  entityPathForFragment,
  fragmentModeHref,
} from "../lib/argusforge/af03-entity-path";
import {
  AF_LABEL,
  provisionalDeckTitle,
  provisionalRealmTitle,
} from "../lib/argusforge/af03-visible-ontology";
import {
  filterDeckItems,
  fragmentMatchesQuery,
} from "../lib/argusforge/af03-deck-search";
import {
  isValidChaosDumpCapture,
  resolveDumpKind,
  resolveDumpTitle,
} from "../lib/argusforge/af03-chaos-dump-images";
import type { Af03RepoState } from "../lib/argusforge/af03-repo-types";
import { DEFAULT_PREFS } from "../lib/argusforge/af03-repo-types";

function state(): Af03RepoState {
  return {
    version: 3,
    folders: [
      {
        id: "realm_a",
        title: "Knowledge",
        parentId: null,
        view: "active",
        createdAt: "t",
        updatedAt: "t",
        lastOpenedAt: null,
        openCount: 0,
      },
      {
        id: "folder_b",
        title: "Nested",
        parentId: "realm_a",
        view: "active",
        createdAt: "t",
        updatedAt: "t",
        lastOpenedAt: null,
        openCount: 0,
      },
    ],
    decks: [
      {
        id: "deck_1",
        title: "Study",
        folderId: "folder_b",
        view: "active",
        contentCount: 1,
        preview: "",
        createdAt: "t",
        updatedAt: "t",
        lastOpenedAt: null,
        openCount: 0,
      },
    ],
    items: [
      {
        id: "frag_1",
        deckId: "deck_1",
        kind: "text",
        title: "Untitled note",
        body: "Controlador vs MCU\nbody line",
        sourceRef: null,
        order: 0,
        createdAt: "t",
        updatedAt: "t",
        unsupported: false,
        unsupportedReason: null,
        markedForLater: false,
        tags: ["hw"],
      },
    ],
    blocks: [
      {
        id: "blk_1",
        fragmentId: "frag_1",
        type: "text",
        order: 0,
        payload: { text: "Controlador vs MCU\nbody line", formatVersion: 1 },
        createdAt: "t",
        updatedAt: "t",
      },
    ],
    assets: [],
    prefs: { ...DEFAULT_PREFS },
  };
}

function run(): void {
  // Ontology labels
  assert.equal(AF_LABEL.chaosDeck, "Chaos Deck");
  assert.equal(AF_LABEL.fragment, "Fragment");
  assert.equal(AF_LABEL.realm, "Realm");

  // Provisional names (non-blocking create)
  assert.equal(provisionalRealmTitle([]), "New Realm");
  assert.equal(provisionalRealmTitle(["New Realm"]), "New Realm 2");
  assert.equal(provisionalDeckTitle(["New Chaos Deck", "New Chaos Deck 2"]), "New Chaos Deck 3");

  // Capture helpers shared
  assert.equal(isValidChaosDumpCapture("", 0), false);
  assert.equal(isValidChaosDumpCapture("hi", 0), true);
  assert.equal(isValidChaosDumpCapture("", 1), true);
  assert.equal(resolveDumpKind("https://example.com", 0), "link");
  assert.equal(resolveDumpKind("note", 1), "mixed");
  assert.equal(resolveDumpTitle("First line\nmore", []), "First line");

  // Entity path uses hierarchy, not modes
  const s = state();
  const path = entityPathForFragment(s, "deck_1", "frag_1");
  assert.ok(path.some((c) => c.title === "Knowledge"));
  assert.ok(path.some((c) => c.title === "Nested"));
  assert.ok(path.some((c) => c.title === "Study"));
  assert.equal(path[path.length - 1]!.kind, "fragment");
  assert.ok(!path.some((c) => /viewer|builder|classic/i.test(c.title)));

  const deckPath = entityPathForDeck(s, "deck_1");
  assert.equal(deckPath[deckPath.length - 1]!.kind, "chaosDeck");

  // Mode hrefs preserve ids (no new fragment)
  assert.ok(fragmentModeHref("deck_1", "frag_1", "viewer").includes("/view"));
  assert.ok(fragmentModeHref("deck_1", "frag_1", "classic").includes("legacy=1"));
  assert.ok(fragmentModeHref("deck_1", "frag_1", "builder").includes("/item/frag_1"));
  assert.ok(!fragmentModeHref("deck_1", "frag_1", "builder").includes("legacy"));

  // Search still finds body / tags
  assert.equal(fragmentMatchesQuery(s, s.items[0]!, "MCU"), true);
  assert.equal(fragmentMatchesQuery(s, s.items[0]!, "hw"), true);
  assert.equal(filterDeckItems(s, "deck_1", "zzzz").length, 0);
  assert.equal(filterDeckItems(s, "deck_1", "").length, 1);

  console.log("ok — argusforge 24-47");
}

run();
