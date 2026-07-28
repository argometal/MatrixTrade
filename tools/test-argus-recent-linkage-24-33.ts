/**
 * ArgusForge 24-33 / 24-36 — Recent linkage projection tests.
 * Run: npx tsx tools/test-argus-recent-linkage-24-33.ts
 * Or: npm run test:argus-recent-linkage
 */
import assert from "node:assert/strict";
import {
  countDeckRelations,
  countFragmentRelations,
  deriveRecentLinkageStatus,
  formatLinkageTime,
  linkageStatusLabel,
  listRecentLinkageRows,
} from "../lib/argusforge/af03-recent-linkage";
import { findChaosInboxId } from "../lib/argusforge/af03-chaos-dump";
import type { Af03ContentItem, Af03RepoState } from "../lib/argusforge/af03-repo-types";
import { DEFAULT_PREFS } from "../lib/argusforge/af03-repo-types";
import type {
  ArgusGraphState,
  ArgusRelation,
  ArgusUnit,
} from "../lib/argusforge/argus-graph-types";

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
      {
        id: "deck_orphan",
        title: "Loose scraps",
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
    items: [],
    blocks: [],
    assets: [],
    prefs: { ...DEFAULT_PREFS },
  };
}

function item(
  partial: Pick<Af03ContentItem, "id" | "deckId" | "createdAt"> &
    Partial<Af03ContentItem>
): Af03ContentItem {
  return {
    kind: "text",
    title: partial.title ?? partial.id,
    body: partial.body ?? "",
    sourceRef: null,
    order: 0,
    updatedAt: partial.updatedAt ?? partial.createdAt,
    unsupported: false,
    unsupportedReason: null,
    markedForLater: false,
    ...partial,
  };
}

function unit(partial: Partial<ArgusUnit> & Pick<ArgusUnit, "id">): ArgusUnit {
  return {
    label: partial.label ?? partial.id,
    preview: "",
    source: "chaos",
    chaosDeckId: null,
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
    ...partial,
  };
}

function relation(
  partial: Pick<ArgusRelation, "id" | "sourceUnitId" | "targetUnitId">
): ArgusRelation {
  return {
    type: "related_to",
    confirmed: true,
    createdAt: "t",
    ...partial,
  };
}

function graph(
  units: ArgusUnit[],
  relations: ArgusRelation[] = []
): ArgusGraphState {
  return {
    version: 3,
    units,
    relations,
    groups: [],
    recurrence: [],
    updatedAt: "t",
  };
}

function run(): void {
  // Inbox helper (not title-only ad-hoc)
  {
    const state = blankState();
    assert.equal(findChaosInboxId(state), "deck_inbox");
  }

  // Labels + tones helpers
  {
    assert.equal(linkageStatusLabel("related", 1), "Related · 1 relation");
    assert.equal(linkageStatusLabel("related", 2), "Related · 2 relations");
    assert.equal(linkageStatusLabel("in_related_deck", 0), "In related Deck");
    assert.equal(linkageStatusLabel("in_realm", 0), "In Realm");
    assert.equal(linkageStatusLabel("unlinked", 0), "Unlinked");
  }

  // Relative time
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

  // Derive priority
  {
    assert.equal(
      deriveRecentLinkageStatus({
        fragmentRelationCount: 1,
        deckRelationCount: 9,
        hasRealm: true,
      }),
      "related"
    );
    assert.equal(
      deriveRecentLinkageStatus({
        fragmentRelationCount: 0,
        deckRelationCount: 1,
        hasRealm: true,
      }),
      "in_related_deck"
    );
    assert.equal(
      deriveRecentLinkageStatus({
        fragmentRelationCount: 0,
        deckRelationCount: 0,
        hasRealm: true,
      }),
      "in_realm"
    );
    assert.equal(
      deriveRecentLinkageStatus({
        fragmentRelationCount: 0,
        deckRelationCount: 0,
        hasRealm: false,
      }),
      "unlinked"
    );
  }

  // 1. Fragment direct relation → related
  {
    const state = blankState();
    state.items = [
      item({
        id: "frag_direct",
        deckId: "deck_ideas",
        title: "Direct",
        createdAt: "2026-07-28T10:00:00.000Z",
      }),
    ];
    const g = graph(
      [
        unit({
          id: "u_frag",
          chaosItemId: "frag_direct",
          chaosDeckId: "deck_ideas",
        }),
        unit({ id: "u_other", chaosItemId: "other", chaosDeckId: "elsewhere" }),
      ],
      [relation({ id: "r1", sourceUnitId: "u_frag", targetUnitId: "u_other" })]
    );
    assert.equal(countFragmentRelations(g, "frag_direct"), 1);
    const rows = listRecentLinkageRows(state, g);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.status, "related");
    assert.equal(rows[0]!.fragmentRelationCount, 1);
    assert.equal(rows[0]!.realmTitle, "Knowledge Realm");
  }

  // 2. Two direct relations → unique count 2
  {
    const state = blankState();
    state.items = [
      item({
        id: "frag_multi",
        deckId: "deck_ideas",
        createdAt: "2026-07-28T10:01:00.000Z",
      }),
    ];
    const g = graph(
      [
        unit({
          id: "u_m",
          chaosItemId: "frag_multi",
          chaosDeckId: "deck_ideas",
        }),
        unit({ id: "u_a" }),
        unit({ id: "u_b" }),
      ],
      [
        relation({ id: "rm1", sourceUnitId: "u_m", targetUnitId: "u_a" }),
        relation({ id: "rm2", sourceUnitId: "u_b", targetUnitId: "u_m" }),
      ]
    );
    assert.equal(countFragmentRelations(g, "frag_multi"), 2);
    const rows = listRecentLinkageRows(state, g);
    assert.equal(rows[0]!.status, "related");
    assert.equal(rows[0]!.fragmentRelationCount, 2);
    assert.equal(
      linkageStatusLabel(rows[0]!.status, rows[0]!.fragmentRelationCount),
      "Related · 2 relations"
    );
  }

  // 3. No Fragment relation, Deck relation → in_related_deck
  {
    const state = blankState();
    state.items = [
      item({
        id: "frag_deck_only",
        deckId: "deck_ideas",
        createdAt: "2026-07-28T10:02:00.000Z",
      }),
    ];
    const g = graph(
      [
        unit({
          id: "u_deck",
          chaosItemId: null,
          chaosDeckId: "deck_ideas",
        }),
        unit({ id: "u_peer" }),
      ],
      [relation({ id: "rd1", sourceUnitId: "u_deck", targetUnitId: "u_peer" })]
    );
    assert.equal(countFragmentRelations(g, "frag_deck_only"), 0);
    assert.equal(countDeckRelations(g, "deck_ideas"), 1);
    const rows = listRecentLinkageRows(state, g);
    assert.equal(rows[0]!.status, "in_related_deck");
    assert.equal(rows[0]!.fragmentRelationCount, 0);
    assert.equal(rows[0]!.deckRelationCount, 1);
    assert.equal(
      linkageStatusLabel(rows[0]!.status, rows[0]!.fragmentRelationCount),
      "In related Deck"
    );
  }

  // 4. Fragment in Realm with no relations → in_realm
  {
    const state = blankState();
    state.items = [
      item({
        id: "frag_realm",
        deckId: "deck_ideas",
        createdAt: "2026-07-28T10:03:00.000Z",
      }),
    ];
    const rows = listRecentLinkageRows(state, graph([]));
    assert.equal(rows[0]!.status, "in_realm");
    assert.equal(rows[0]!.fragmentRelationCount, 0);
    assert.equal(rows[0]!.deckRelationCount, 0);
    assert.equal(rows[0]!.realmTitle, "Knowledge Realm");
  }

  // 5. Chaos Inbox with no relations → unlinked
  {
    const state = blankState();
    state.items = [
      item({
        id: "frag_inbox",
        deckId: "deck_inbox",
        title: "Inbox note",
        createdAt: "2026-07-28T10:04:00.000Z",
      }),
    ];
    const rows = listRecentLinkageRows(state, graph([]));
    assert.equal(findChaosInboxId(state), "deck_inbox");
    assert.equal(rows[0]!.status, "unlinked");
    assert.equal(rows[0]!.isInbox, true);
    assert.equal(rows[0]!.deckTitle, "Chaos Inbox");
    assert.equal(rows[0]!.realmTitle, null);
  }

  // 6. Chaos Inbox with direct Fragment relation → related
  {
    const state = blankState();
    state.items = [
      item({
        id: "frag_inbox_rel",
        deckId: "deck_inbox",
        createdAt: "2026-07-28T10:05:00.000Z",
      }),
    ];
    const g = graph(
      [
        unit({
          id: "u_inbox_f",
          chaosItemId: "frag_inbox_rel",
          chaosDeckId: "deck_inbox",
        }),
        unit({ id: "u_x" }),
      ],
      [relation({ id: "ri1", sourceUnitId: "u_inbox_f", targetUnitId: "u_x" })]
    );
    const rows = listRecentLinkageRows(state, g);
    assert.equal(rows[0]!.status, "related");
    assert.equal(rows[0]!.fragmentRelationCount, 1);
    assert.equal(rows[0]!.isInbox, true);
  }

  // 7. Chaos Inbox with Deck-only relation → in_related_deck
  {
    const state = blankState();
    state.items = [
      item({
        id: "frag_inbox_deck",
        deckId: "deck_inbox",
        createdAt: "2026-07-28T10:06:00.000Z",
      }),
    ];
    const g = graph(
      [
        unit({
          id: "u_inbox_deck",
          chaosItemId: null,
          chaosDeckId: "deck_inbox",
        }),
        unit({ id: "u_y" }),
      ],
      [
        relation({
          id: "rid1",
          sourceUnitId: "u_inbox_deck",
          targetUnitId: "u_y",
        }),
      ]
    );
    const rows = listRecentLinkageRows(state, g);
    assert.equal(rows[0]!.status, "in_related_deck");
    assert.equal(rows[0]!.fragmentRelationCount, 0);
    assert.equal(rows[0]!.deckRelationCount, 1);
  }

  // 8. Relation unrelated to Fragment and Deck does not affect status
  {
    const state = blankState();
    state.items = [
      item({
        id: "frag_alone",
        deckId: "deck_orphan",
        createdAt: "2026-07-28T10:07:00.000Z",
      }),
    ];
    const g = graph(
      [
        unit({
          id: "u_noise",
          chaosItemId: "someone_else",
          chaosDeckId: "other_deck",
        }),
        unit({ id: "u_z" }),
      ],
      [relation({ id: "rn1", sourceUnitId: "u_noise", targetUnitId: "u_z" })]
    );
    const rows = listRecentLinkageRows(state, g);
    assert.equal(rows[0]!.status, "unlinked");
    assert.equal(rows[0]!.fragmentRelationCount, 0);
    assert.equal(rows[0]!.deckRelationCount, 0);
  }

  // 9. Duplicate endpoint matching does not double-count relation
  {
    const g = graph(
      [
        unit({
          id: "u_a",
          chaosItemId: "f_dup",
          chaosDeckId: "d_dup",
        }),
        unit({
          id: "u_b",
          chaosItemId: null,
          chaosDeckId: "d_dup",
        }),
      ],
      [relation({ id: "r_both", sourceUnitId: "u_a", targetUnitId: "u_b" })]
    );
    assert.equal(countFragmentRelations(g, "f_dup"), 1);
    assert.equal(countDeckRelations(g, "d_dup"), 1);
  }

  // 10. Latest five order by createdAt
  {
    const state = blankState();
    state.items = Array.from({ length: 7 }, (_, i) =>
      item({
        id: `frag_ord_${i}`,
        deckId: "deck_orphan",
        createdAt: `2026-07-28T1${i}:00:00.000Z`,
      })
    );
    const rows = listRecentLinkageRows(state, graph([]), 5);
    assert.equal(rows.length, 5);
    assert.deepEqual(
      rows.map((r) => r.fragmentId),
      [
        "frag_ord_6",
        "frag_ord_5",
        "frag_ord_4",
        "frag_ord_3",
        "frag_ord_2",
      ]
    );
  }

  // 11. Image thumbnail reference remains optional
  {
    const state = blankState();
    state.items = [
      item({
        id: "frag_img",
        deckId: "deck_orphan",
        kind: "image",
        title: "Shot",
        createdAt: "2026-07-28T11:00:00.000Z",
      }),
    ];
    state.blocks = [
      {
        id: "blk_img",
        fragmentId: "frag_img",
        type: "image",
        order: 0,
        payload: { assetId: "asset_1" },
        createdAt: "t",
        updatedAt: "t",
      },
    ];
    const rows = listRecentLinkageRows(state, graph([]));
    assert.equal(rows[0]!.kind, "image");
    assert.equal(rows[0]!.imageAssetId, "asset_1");
    assert.equal(rows[0]!.status, "unlinked");

    // Missing asset / no block still projects
    state.blocks = [];
    const rows2 = listRecentLinkageRows(state, graph([]));
    assert.equal(rows2[0]!.imageAssetId, null);
  }

  // 12. Old text-only Fragment still projects safely
  {
    const state = blankState();
    state.items = [
      item({
        id: "frag_txt",
        deckId: "deck_orphan",
        kind: "text",
        title: "Legacy note",
        body: "plain text only",
        createdAt: "2026-07-28T12:00:00.000Z",
      }),
    ];
    const rows = listRecentLinkageRows(state, null);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.title, "Legacy note");
    assert.equal(rows[0]!.imageAssetId, null);
    assert.equal(rows[0]!.status, "unlinked");
    assert.equal(rows[0]!.fragmentRelationCount, 0);
    assert.equal(rows[0]!.deckRelationCount, 0);
  }

  // Deck relation must not imply Fragment Related
  {
    const state = blankState();
    state.items = [
      item({
        id: "frag_not_related",
        deckId: "deck_ideas",
        createdAt: "2026-07-28T13:00:00.000Z",
      }),
    ];
    const g = graph(
      [
        unit({
          id: "u_sibling",
          chaosItemId: "other_frag",
          chaosDeckId: "deck_ideas",
        }),
        unit({ id: "u_out" }),
      ],
      [
        relation({
          id: "rsib",
          sourceUnitId: "u_sibling",
          targetUnitId: "u_out",
        }),
      ]
    );
    const rows = listRecentLinkageRows(state, g);
    assert.equal(rows[0]!.status, "in_related_deck");
    assert.notEqual(rows[0]!.status, "related");
  }

  console.log("ok — argus recent linkage 24-33/24-36");
}

run();
