/**
 * CHANGE 24-33 — Recent linkage derivation tests.
 */
import assert from "node:assert/strict";
import {
  countFragmentRelations,
  deriveLinkageStatus,
  formatLinkageTime,
  listRecentLinkageRows,
  linkageStatusLabel,
} from "../lib/argusforge/af03-recent-linkage";
import type { Af03RepoState } from "../lib/argusforge/af03-repo-types";
import { DEFAULT_PREFS } from "../lib/argusforge/af03-repo-types";
import type { ArgusGraphState } from "../lib/argusforge/argus-graph-types";

function blankState(): Af03RepoState {
  return {
    version: 3,
    folders: [
      {
        id: "realm_knowledge",
        title: "Knowledge Realm",
        parentId: null,
        view: "active",
        createdAt: "t",
        updatedAt: "t",
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
        contentCount: 0,
        preview: "",
        createdAt: "t",
        updatedAt: "t",
        lastOpenedAt: null,
        openCount: 0,
      },
      {
        id: "deck_ideas",
        title: "Ideas",
        folderId: "realm_knowledge",
        view: "active",
        contentCount: 0,
        preview: "",
        createdAt: "t",
        updatedAt: "t",
        lastOpenedAt: null,
        openCount: 0,
      },
    ],
    items: [],
    blocks: [],
    assets: [],
    prefs: { ...DEFAULT_PREFS },
  };
}

{
  assert.equal(
    deriveLinkageStatus({ isInbox: true, realmTitle: null, relationCount: 0 }),
    "unlinked"
  );
  assert.equal(
    deriveLinkageStatus({
      isInbox: false,
      realmTitle: "Knowledge Realm",
      relationCount: 0,
    }),
    "in_realm"
  );
  assert.equal(
    deriveLinkageStatus({
      isInbox: true,
      realmTitle: null,
      relationCount: 2,
    }),
    "related"
  );
  assert.equal(linkageStatusLabel("related", 2), "Related · 2 relations");
  assert.equal(linkageStatusLabel("in_realm", 0), "In Realm");
  assert.equal(linkageStatusLabel("unlinked", 0), "Unlinked");
}

{
  const now = Date.parse("2026-07-28T12:00:00.000Z");
  assert.equal(
    formatLinkageTime(new Date(now - 4 * 60_000).toISOString(), now),
    "4m"
  );
  assert.equal(
    formatLinkageTime(new Date(now - 60 * 60_000).toISOString(), now),
    "1h"
  );
}

{
  const state = blankState();
  state.items = [
    {
      id: "item_old",
      deckId: "deck_inbox",
      kind: "text",
      title: "Old",
      body: "old",
      sourceRef: null,
      order: 0,
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
      unsupported: false,
      unsupportedReason: null,
      markedForLater: false,
    },
    {
      id: "item_new",
      deckId: "deck_ideas",
      kind: "text",
      title: "Alexandria structure",
      body: "notes",
      sourceRef: null,
      order: 0,
      createdAt: "2026-07-28T11:00:00.000Z",
      updatedAt: "2026-07-28T11:00:00.000Z",
      unsupported: false,
      unsupportedReason: null,
      markedForLater: false,
    },
    {
      id: "item_inbox",
      deckId: "deck_inbox",
      kind: "text",
      title: "Graph interface note",
      body: "x",
      sourceRef: null,
      order: 1,
      createdAt: "2026-07-28T11:30:00.000Z",
      updatedAt: "2026-07-28T11:30:00.000Z",
      unsupported: false,
      unsupportedReason: null,
      markedForLater: false,
    },
  ];

  const graph: ArgusGraphState = {
    version: 3,
    units: [
      {
        id: "u1",
        label: "a",
        preview: "",
        source: "chaos",
        chaosDeckId: "deck_ideas",
        chaosItemId: "item_new",
        kind: "text",
        position: { x: 0, y: 0 },
        unitType: "Note",
        typeManual: false,
        evidenceType: "observation",
        evidenceManual: false,
        tags: [],
        confirmed: true,
        createdAt: "t",
        updatedAt: "t",
      },
      {
        id: "u2",
        label: "b",
        preview: "",
        source: "chaos",
        chaosDeckId: "deck_ideas",
        chaosItemId: null,
        kind: "text",
        position: { x: 0, y: 0 },
        unitType: "Note",
        typeManual: false,
        evidenceType: "observation",
        evidenceManual: false,
        tags: [],
        confirmed: true,
        createdAt: "t",
        updatedAt: "t",
      },
    ],
    relations: [
      {
        id: "r1",
        sourceUnitId: "u1",
        targetUnitId: "u2",
        type: "related_to",
        confirmed: true,
        createdAt: "t",
      },
    ],
    groups: [],
    recurrence: [],
    updatedAt: "t",
  };

  assert.equal(countFragmentRelations(graph, "item_new", "deck_ideas"), 1);

  const rows = listRecentLinkageRows(state, graph, 5);
  assert.equal(rows.length, 3);
  assert.equal(rows[0]!.fragmentId, "item_inbox");
  assert.equal(rows[0]!.status, "unlinked");
  assert.equal(rows[0]!.deckTitle, "Chaos Inbox");
  assert.equal(rows[1]!.fragmentId, "item_new");
  assert.equal(rows[1]!.status, "related");
  assert.equal(rows[1]!.realmTitle, "Knowledge Realm");
  assert.equal(rows[2]!.fragmentId, "item_old");
}

console.log("test-argus-recent-linkage-24-33: ok");
