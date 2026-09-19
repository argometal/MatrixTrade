/**
 * CHANGE 24-50 — Global Find → Fragment Viewer.
 * Run: npx tsx tools/test-chaos-global-find-24-50.ts
 * Or: npm run test:chaos-global-find
 */
import assert from "node:assert/strict";
import { searchExplorer } from "../lib/argusforge/af03-home-explorer";
import {
  filterDeckItems,
  fragmentMatchesQuery,
} from "../lib/argusforge/af03-deck-search";
import type { Af03RepoState } from "../lib/argusforge/af03-repo-types";
import { DEFAULT_PREFS } from "../lib/argusforge/af03-repo-types";
import { viewHref } from "../lib/argusforge/af03-repo-store";

function state(): Af03RepoState {
  return {
    version: 3,
    folders: [
      {
        id: "realm_a",
        title: "Scratch",
        parentId: null,
        view: "active",
        createdAt: "t0",
        updatedAt: "t0",
        lastOpenedAt: null,
        openCount: 0,
      },
    ],
    decks: [
      {
        id: "deck_inbox",
        title: "Chaos Inbox",
        folderId: null,
        view: "active",
        contentCount: 1,
        preview: "",
        createdAt: "t0",
        updatedAt: "t0",
        lastOpenedAt: null,
        openCount: 0,
      },
      {
        id: "deck_other",
        title: "Other bin",
        folderId: "realm_a",
        view: "active",
        contentCount: 1,
        preview: "",
        createdAt: "t0",
        updatedAt: "t1",
        lastOpenedAt: null,
        openCount: 0,
      },
    ],
    items: [
      {
        id: "item_body",
        deckId: "deck_inbox",
        kind: "text",
        title: "Untitled note",
        body: "microcontroladores y memoria espacial",
        sourceRef: null,
        order: 0,
        createdAt: "2026-08-31T10:00:00.000Z",
        updatedAt: "2026-08-31T10:00:00.000Z",
        unsupported: false,
        unsupportedReason: null,
        markedForLater: false,
        tags: [],
      },
      {
        id: "item_block",
        deckId: "deck_other",
        kind: "mixed",
        title: "Untitled fragment",
        body: "visible body sync",
        sourceRef: null,
        order: 0,
        createdAt: "2026-08-31T11:00:00.000Z",
        updatedAt: "2026-08-31T12:00:00.000Z",
        unsupported: false,
        unsupportedReason: null,
        markedForLater: false,
        tags: ["hw"],
      },
    ],
    blocks: [
      {
        id: "blk_1",
        fragmentId: "item_block",
        type: "text",
        order: 0,
        payload: { text: "only in block: fibonacci locus story", formatVersion: 1 },
        createdAt: "t",
        updatedAt: "t",
      },
      {
        id: "blk_2",
        fragmentId: "item_block",
        type: "image",
        order: 1,
        payload: { assetId: "asset_1", caption: "maze collage wall", alt: "wall shot" },
        createdAt: "t",
        updatedAt: "t",
      },
    ],
    assets: [
      {
        id: "asset_1",
        mimeType: "image/png",
        filename: "corridor-turn.png",
        byteSize: 12,
        createdAt: "t",
      },
    ],
    prefs: { ...DEFAULT_PREFS },
  };
}

const s = state();

// 1–2: find by body content globally (not inside that Deck route)
const bodyHits = searchExplorer(s, "microcontroladores");
assert.equal(bodyHits.length, 1);
assert.equal(bodyHits[0]!.objectType, "fragment");
assert.equal(bodyHits[0]!.id, "item_body");
assert.equal(bodyHits[0]!.href, viewHref("deck_inbox", "item_body"));
assert.ok(bodyHits[0]!.href.endsWith("/view"), "Fragment hit must open Viewer");
assert.equal(bodyHits[0]!.deckTitle, "Chaos Inbox");

// 3: find content that lives in Blocks (not only body/title)
const blockHits = searchExplorer(s, "fibonacci locus");
assert.equal(blockHits.length, 1);
assert.equal(blockHits[0]!.id, "item_block");
assert.equal(blockHits[0]!.href, viewHref("deck_other", "item_block"));
assert.equal(blockHits[0]!.deckTitle, "Other bin");

const captionHits = searchExplorer(s, "corridor-turn");
assert.equal(captionHits.length, 1);
assert.equal(captionHits[0]!.id, "item_block");

const tagHits = searchExplorer(s, "hw");
assert.ok(tagHits.some((h) => h.id === "item_block"));

// 4: find without being "in" the Deck — searchExplorer is global
assert.ok(fragmentMatchesQuery(s, s.items[1]!, "maze collage"));
assert.equal(filterDeckItems(s, "deck_inbox", "fibonacci").length, 0);
assert.equal(filterDeckItems(s, "deck_other", "fibonacci").length, 1);
assert.equal(searchExplorer(s, "fibonacci").length, 1);

// Deck / Realm still searchable; Deck hit is not forced to /view
const deckHits = searchExplorer(s, "Other bin");
assert.ok(deckHits.some((h) => h.objectType === "chaos_deck" && h.href === "/forge/deck/deck_other"));

const realmHits = searchExplorer(s, "Scratch");
assert.ok(realmHits.some((h) => h.objectType === "realm"));

// Provenance is present; not claimed as semantic topic
for (const h of searchExplorer(s, "locus")) {
  if (h.objectType === "fragment") {
    assert.ok(h.deckTitle);
    assert.ok(h.href.includes("/view"));
    assert.ok(!h.href.endsWith(`/item/${h.id}`), "must not open Editor route");
  }
}

console.log("test-chaos-global-find-24-50: ok");
