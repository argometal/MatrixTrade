/**
 * Prompt 25-127 — stale ATTN-INBOX-PROPOSALS must clear when Inbox is empty.
 * Run: npm run test:attn-inbox-stale
 */
import assert from "node:assert/strict";
import { buildAttentionItems } from "../lib/dashboard-attention";
import {
  buildNeedsAttentionTaskSnapshot,
  enrichAttentionItemsWithAiSnapshots,
} from "../lib/needs-attention-ai";
import {
  inboxAttentionLabel,
  normalizePendingInboxItems,
  pendingInboxCount,
  pendingInboxProposalIds,
} from "../lib/pending-inbox";
import type { BridgeInboxItem } from "../lib/bridge";
import type { Trade } from "../lib/types";
import type { Playbook } from "../lib/playbook-types";

function item(
  id: string,
  status: BridgeInboxItem["status"],
  receivedAt: string,
  origin: BridgeInboxItem["origin"] = "supabase"
): BridgeInboxItem {
  return {
    id,
    status,
    receivedAt,
    payload: { type: "trade-update", proposal: { id: "H001" } },
    origin,
  };
}

const trades = [
  {
    id: "H001",
    ticker: "AMZN",
    status: "open",
    entry: 100,
    stop: 90,
    shares: 1,
    createdAt: "2026-07-01T00:00:00.000Z",
    playbookId: "secular-trend-continuation",
  } as Trade,
];
const playbooks = [
  {
    id: "secular-trend-continuation",
    name: "Secular Trend Continuation",
    status: "ACTIVE",
  } as Playbook,
];

// ---------------------------------------------------------------------------
// Dedupe + pending filter
// ---------------------------------------------------------------------------
{
  const duplicated: BridgeInboxItem[] = [
    item("PROP-A", "pending", "2026-07-20T10:00:00.000Z", "worker"),
    item("PROP-A", "pending", "2026-07-20T11:00:00.000Z", "supabase"),
    item("PROP-B", "pending", "2026-07-20T09:00:00.000Z", "worker"),
    item("PROP-B", "pending", "2026-07-20T09:00:00.000Z", "supabase"),
    item("PROP-C", "applied", "2026-07-20T08:00:00.000Z", "worker"),
    item("PROP-D", "rejected", "2026-07-20T07:00:00.000Z", "supabase"),
  ];

  const live = normalizePendingInboxItems(duplicated);
  assert.equal(live.length, 2);
  assert.equal(pendingInboxCount(duplicated), 2);
  assert.deepEqual(pendingInboxProposalIds(duplicated).sort(), [
    "PROP-A",
    "PROP-B",
  ]);
  assert.equal(
    live.find((row) => row.id === "PROP-A")?.origin,
    "supabase",
    "newest receivedAt wins on dedupe"
  );

  const attention = buildAttentionItems(trades, duplicated, playbooks);
  const inboxRow = attention.find((row) => row.id === "inbox");
  assert.ok(inboxRow, "ATTN inbox row present while pending exist");
  assert.equal(inboxRow!.label, inboxAttentionLabel(2));
  assert.equal(inboxRow!.label, "Apply 2 inbox proposals");
}

// ---------------------------------------------------------------------------
// Reject/remove all → regenerate Needs Attention → ATTN-INBOX-PROPOSALS absent
// ---------------------------------------------------------------------------
{
  const pendingThenGone: BridgeInboxItem[] = [
    item("PROP-1", "pending", "2026-07-21T10:00:00.000Z", "worker"),
    item("PROP-1", "pending", "2026-07-21T10:00:00.000Z", "supabase"),
    item("PROP-2", "pending", "2026-07-21T11:00:00.000Z", "worker"),
  ];

  const before = buildAttentionItems(trades, pendingThenGone, playbooks);
  assert.ok(before.some((row) => row.id === "inbox"));

  // Simulate remove/reject all underlying proposals (no recreation).
  const afterRemoval: BridgeInboxItem[] = [
    item("PROP-1", "applied", "2026-07-21T10:00:00.000Z", "worker"),
    item("PROP-1", "applied", "2026-07-21T10:00:00.000Z", "supabase"),
    item("PROP-2", "rejected", "2026-07-21T11:00:00.000Z", "worker"),
  ];

  const after = buildAttentionItems(trades, afterRemoval, playbooks);
  assert.ok(
    !after.some((row) => row.id === "inbox"),
    "ATTN-INBOX-PROPOSALS must not be generated when pendingInboxCount === 0"
  );

  // Stale raw inbox attention row must be stripped on enrich when live set is empty.
  const staleRaw = [
    {
      id: "inbox",
      label: "Apply 17 inbox proposals",
      href: "/inbox",
      priority: 2,
    },
  ];
  const enriched = enrichAttentionItemsWithAiSnapshots(staleRaw, {
    trades,
    plans: [],
    playbooks,
    pendingInbox: afterRemoval,
  });
  assert.equal(enriched.length, 0, "stale inbox attention removed on enrich");

  // Snapshot with empty live pending must not embed historical proposal IDs.
  const snapshot = buildNeedsAttentionTaskSnapshot(
    {
      id: "inbox",
      label: "Apply 17 inbox proposals",
      href: "/inbox",
      priority: 2,
    },
    {
      trades,
      plans: [],
      playbooks,
      pendingInbox: afterRemoval,
    }
  );
  assert.equal(snapshot.task.id, "ATTN-INBOX-PROPOSALS");
  assert.equal(snapshot.currentState.pendingInboxCount, 0);
  assert.equal(snapshot.linkedEntities.inboxProposalIds, undefined);
}

// ---------------------------------------------------------------------------
// Empty live list → no ATTN
// ---------------------------------------------------------------------------
{
  assert.equal(normalizePendingInboxItems([]).length, 0);
  const attention = buildAttentionItems(trades, [], playbooks);
  assert.ok(!attention.some((row) => row.id === "inbox"));
}

console.log("test-attn-inbox-stale-25-127: ok");
