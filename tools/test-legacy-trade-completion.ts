/**
 * Prompt 25-08 — snapshot label hygiene + H002 legacy completion e2e (in-memory).
 * Run: npm run test:legacy-trade-completion
 */
import assert from "node:assert/strict";
import { buildApplySchemaContractText } from "../lib/apply-schema-contract";
import { parseTradingInboxPayload, validateProposalPayload } from "../lib/bridge";
import {
  classifyIncompleteClosedTrade,
  listIncompleteClosedTrades,
} from "../lib/incomplete-closed-trades";
import {
  applyLegacyTradeUpdateLocally,
  assertNoForbiddenSnapshotPaths,
  buildLegacyTradeUpdateExample,
  LEGACY_ABSENT_PLAN_ID,
  LEGACY_ABSENT_PLAYBOOK_ID,
  VISIBLE_SNAPSHOT_MENU_LABELS,
} from "../lib/legacy-trade-completion";
import { buildMatrixMechanicsBrief } from "../lib/matrix-mechanics-brief";
import { buildMatrixMechanicsSnapshot } from "../lib/matrix-mechanics-snapshot";
import {
  getAllowedApplyBlocksForNeedsAttentionTask,
  getNeedsAttentionCompletionCondition,
} from "../lib/needs-attention-ai";
import type { Trade } from "../lib/types";

// ---------------------------------------------------------------------------
// 1. Mechanics / schema must not teach nonexistent Control labels
// ---------------------------------------------------------------------------
{
  const brief = buildMatrixMechanicsBrief();
  const snap = buildMatrixMechanicsSnapshot();
  const contract = buildApplySchemaContractText();

  for (const [label, text] of [
    ["mechanics-brief", brief],
    ["mechanics-snapshot", snap],
    ["schema-contract", contract],
  ] as const) {
    const hits = assertNoForbiddenSnapshotPaths(text, label);
    assert.equal(hits.length, 0, hits.join("\n"));
    assert.ok(!/\bTrain AI\b/.test(text.replace(/FORBIDDEN:.*Train AI.*/g, "")), `${label} mentions Train AI`);
  }

  assert.ok(brief.includes("Apply schema contract"), "brief lists Apply schema contract");
  assert.ok(brief.includes("Dashboard snapshot"), "brief lists Dashboard snapshot");
  assert.ok(brief.includes("__legacy_none__"), "brief documents playbook absence sentinel");
  assert.ok(brief.includes("__LEGACY_NONE__"), "brief documents plan absence sentinel");
  assert.ok(contract.includes("LEGACY TRADE COMPLETION"), "contract has legacy section");
  assert.ok(contract.includes("Control → MTA Mechanics → Apply schema contract"));

  for (const label of ["MTA Mechanics", "Apply schema contract", "Dashboard snapshot", "Apply"] as const) {
    assert.ok(
      VISIBLE_SNAPSHOT_MENU_LABELS.includes(label),
      `visible menu missing ${label}`
    );
  }
}

// ---------------------------------------------------------------------------
// 2. H002 e2e: snapshot diagnosis → valid blocks → gaps cleared
// ---------------------------------------------------------------------------
{
  const h002 = {
    id: "H002",
    ticker: "GOOGL",
    status: "closed",
    entry: 175.5,
    stop: 170,
    shares: 10,
    exit: 172.25,
    closedAt: "2026-07-10T00:00:00.000Z",
    createdAt: "2026-07-09T00:00:00.000Z",
  } as Trade;

  const beforeGaps = classifyIncompleteClosedTrade(h002);
  assert.ok(beforeGaps.includes("needs_review"));
  assert.ok(beforeGaps.includes("missing_playbook"));
  assert.ok(beforeGaps.includes("missing_plan"));
  assert.ok(beforeGaps.includes("missing_thesis"));
  assert.ok(beforeGaps.includes("missing_planned_rr"));
  assert.ok(beforeGaps.includes("missing_loss_classification"));
  assert.ok(beforeGaps.includes("missing_post_stop_study"));

  const allowed = getAllowedApplyBlocksForNeedsAttentionTask("incomplete_closed_aggregate");
  assert.ok(allowed.includes("trade-update"));
  assert.ok(allowed.includes("trade-review"));
  assert.match(
    getNeedsAttentionCompletionCondition("incomplete_closed_aggregate"),
    /review \+ required learning fields/i
  );

  const updateBlock = buildLegacyTradeUpdateExample("H002");
  const parsedUpdate = parseTradingInboxPayload(updateBlock);
  assert.ok(parsedUpdate, "legacy trade-update parses");
  const updateOk = validateProposalPayload(parsedUpdate!);
  assert.equal(
    updateOk.ok,
    true,
    updateOk.ok ? "" : (updateOk as { ok: false; errors: string[] }).errors.join("; ")
  );

  const reviewBlock = {
    type: "trade-review",
    source: "ai-block",
    proposal: {
      id: "H002",
      qualityEntry: 3,
      qualityExit: 3,
      qualityMgmt: 3,
      mistakes: ["none"],
      lesson: "Legacy fill recorded without inventing Scout/Playbook links.",
    },
  };
  const parsedReview = parseTradingInboxPayload(reviewBlock);
  assert.ok(parsedReview, "trade-review parses");
  const reviewOk = validateProposalPayload(parsedReview!);
  assert.equal(
    reviewOk.ok,
    true,
    reviewOk.ok ? "" : (reviewOk as { ok: false; errors: string[] }).errors.join("; ")
  );

  let next = applyLegacyTradeUpdateLocally(
    h002,
    updateBlock.proposal as Record<string, unknown>
  );
  next = {
    ...next,
    reviewedAt: "2026-07-11T00:00:00.000Z",
  };

  assert.equal(next.playbookId, LEGACY_ABSENT_PLAYBOOK_ID);
  assert.equal(next.planId, LEGACY_ABSENT_PLAN_ID);
  assert.deepEqual(classifyIncompleteClosedTrade(next), []);
  assert.equal(
    listIncompleteClosedTrades([next]).length,
    0,
    "ATTN-INCOMPLETE-CLOSED clears for H002 after valid blocks"
  );
}

// ---------------------------------------------------------------------------
// 3. Invented / empty links do NOT clear gaps
// ---------------------------------------------------------------------------
{
  const bare = {
    id: "H002",
    ticker: "GOOGL",
    status: "closed",
    entry: 100,
    stop: 90,
    shares: 1,
    exit: 95,
    closedAt: "2026-07-10T00:00:00.000Z",
    createdAt: "2026-07-01T00:00:00.000Z",
    reviewedAt: "2026-07-11T00:00:00.000Z",
    thesis: "x",
    riskRewardPlanned: 2,
    lossClassification: "pending_study",
    postStopStudy: {
      enabled: true,
      durationDays: 90,
      startedAt: "2026-07-10T00:00:00.000Z",
      endsAt: "2026-10-08T00:00:00.000Z",
      originalTradeId: "H002",
      originalEntry: 100,
    },
  } as Trade;

  assert.ok(classifyIncompleteClosedTrade(bare).includes("missing_playbook"));
  assert.ok(classifyIncompleteClosedTrade(bare).includes("missing_plan"));

  const withSentinels = applyLegacyTradeUpdateLocally(bare, {
    playbookId: LEGACY_ABSENT_PLAYBOOK_ID,
    planId: LEGACY_ABSENT_PLAN_ID,
  });
  assert.deepEqual(classifyIncompleteClosedTrade(withSentinels), []);
}

console.log("test-legacy-trade-completion: ok");
