/**
 * CHANGE 24-39 — Chaos Deck search + display helpers.
 * Run: npx tsx tools/test-chaos-deck-24-39.ts
 * Or: npm run test:chaos-deck-24-39
 */
import assert from "node:assert/strict";
import {
  filterDeckItems,
  fragmentDisplayTitle,
  fragmentMatchesQuery,
  fragmentPreviewText,
  fragmentSearchHaystack,
} from "../lib/argusforge/af03-deck-search";
import { titleFromDump } from "../lib/argusforge/af03-chaos-dump";
import type { Af03RepoState } from "../lib/argusforge/af03-repo-types";
import { DEFAULT_PREFS } from "../lib/argusforge/af03-repo-types";

function blankState(): Af03RepoState {
  return {
    version: 3,
    folders: [],
    decks: [
      {
        id: "deck_a",
        title: "Study",
        folderId: null,
        view: "active",
        contentCount: 0,
        preview: "",
        createdAt: "t",
        updatedAt: "t",
        lastOpenedAt: null,
        openCount: 0,
      },
    ],
    items: [
      {
        id: "item_1",
        deckId: "deck_a",
        kind: "text",
        title: "Untitled note",
        body: "Controlador vs microprocesadores\njuegos, internet, edición",
        sourceRef: null,
        order: 0,
        createdAt: "2026-07-28T10:00:00.000Z",
        updatedAt: "2026-07-28T10:00:00.000Z",
        unsupported: false,
        unsupportedReason: null,
        markedForLater: false,
        tags: ["hardware"],
      },
      {
        id: "item_2",
        deckId: "deck_a",
        kind: "link",
        title: "Docs",
        body: "https://example.com/chaos",
        sourceRef: "https://example.com/chaos",
        order: 1,
        createdAt: "2026-07-28T11:00:00.000Z",
        updatedAt: "2026-07-28T11:00:00.000Z",
        unsupported: false,
        unsupportedReason: null,
        markedForLater: false,
      },
      {
        id: "item_3",
        deckId: "deck_a",
        kind: "image",
        title: "Shot",
        body: "",
        sourceRef: null,
        order: 2,
        createdAt: "2026-07-28T12:00:00.000Z",
        updatedAt: "2026-07-28T12:00:00.000Z",
        unsupported: false,
        unsupportedReason: null,
        markedForLater: false,
      },
      {
        id: "item_other",
        deckId: "deck_other",
        kind: "text",
        title: "Other deck",
        body: "microprocesadores elsewhere",
        sourceRef: null,
        order: 0,
        createdAt: "t",
        updatedAt: "t",
        unsupported: false,
        unsupportedReason: null,
        markedForLater: false,
      },
    ],
    blocks: [
      {
        id: "blk_1",
        fragmentId: "item_1",
        type: "text",
        order: 0,
        payload: {
          text: "Controlador vs microprocesadores\njuegos, internet, edición",
          formatVersion: 1,
        },
        createdAt: "t",
        updatedAt: "t",
      },
      {
        id: "blk_img",
        fragmentId: "item_3",
        type: "image",
        order: 0,
        payload: { assetId: "asset_board", alt: "pcb board" },
        createdAt: "t",
        updatedAt: "t",
      },
    ],
    assets: [
      {
        id: "asset_board",
        mimeType: "image/png",
        filename: "pcb-schematic.png",
        byteSize: 1200,
        createdAt: "t",
      },
    ],
    prefs: { ...DEFAULT_PREFS },
  };
}

function run(): void {
  const state = blankState();

  // Title from dump — first useful line, no modal
  assert.equal(
    titleFromDump("Controlador vs MCU\nmore body"),
    "Controlador vs MCU"
  );
  assert.equal(titleFromDump("   "), "Untitled dump");

  // Display title falls back to first body line when Untitled
  assert.equal(
    fragmentDisplayTitle(state.items[0]!),
    "Controlador vs microprocesadores"
  );
  assert.equal(fragmentDisplayTitle(state.items[1]!), "Docs");

  // Preview is multi-line capable
  const preview = fragmentPreviewText(state.items[0]!);
  assert.ok(preview.includes("microprocesadores"));
  assert.ok(preview.includes("juegos"));

  // Search title
  assert.equal(fragmentMatchesQuery(state, state.items[1]!, "docs"), true);

  // Search body
  assert.equal(
    fragmentMatchesQuery(state, state.items[0]!, "internet"),
    true
  );

  // Search tags
  assert.equal(
    fragmentMatchesQuery(state, state.items[0]!, "hardware"),
    true
  );

  // Search link / sourceRef
  assert.equal(
    fragmentMatchesQuery(state, state.items[1]!, "example.com"),
    true
  );

  // Search filename via image asset
  assert.equal(
    fragmentMatchesQuery(state, state.items[2]!, "pcb-schematic"),
    true
  );
  assert.equal(
    fragmentMatchesQuery(state, state.items[2]!, "pcb board"),
    true
  );

  // Unrelated query
  assert.equal(
    fragmentMatchesQuery(state, state.items[0]!, "zzzz-none"),
    false
  );

  // Filter entire deck (not other decks)
  const matches = filterDeckItems(state, "deck_a", "microprocesadores");
  assert.equal(matches.length, 1);
  assert.equal(matches[0]!.id, "item_1");

  // Empty query restores full deck
  const all = filterDeckItems(state, "deck_a", "   ");
  assert.equal(all.length, 3);

  // Haystack includes block text
  const hay = fragmentSearchHaystack(state, state.items[0]!);
  assert.ok(hay.includes("controlador"));
  assert.ok(hay.includes("hardware"));

  console.log("ok — chaos deck 24-39");
}

run();
