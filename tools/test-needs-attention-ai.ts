import assert from "node:assert/strict";
import {
  buildNeedsAttentionTaskId,
  buildNeedsAttentionTaskSnapshot,
  buildNeedsAttentionSnapshotText,
  classifyNeedsAttentionTaskType,
  enrichAttentionItemWithAiSnapshot,
  getAllowedApplyBlocksForNeedsAttentionTask,
  getNeedsAttentionCompletionCondition,
  getNeedsAttentionSnapshotSupport,
  validateNeedsAttentionSnapshot,
} from "../lib/needs-attention-ai";
import { buildAttentionItems } from "../lib/dashboard-attention";
import { buildLearningAttentionItems } from "../lib/learning-attention";
import { buildPlanAttentionItems } from "../lib/plan-attention";
import { buildLibraryIndexBrief } from "../lib/library-index";
import type { AttentionItem } from "../lib/dashboard-attention";
import type { Trade } from "../lib/types";
import type { TradePlan } from "../lib/plan-types";
import type { Playbook } from "../lib/playbook-types";
import type { LearningOutcome } from "../lib/learning-outcome-types";
import type { ObservationRecord } from "../lib/observation-types";
import type { BridgeInboxItem } from "../lib/bridge";

/** Fixtures — one per audited task type. */
const openTrade = {
  id: "H001",
  ticker: "AMZN",
  status: "open",
  entry: 100,
  stop: 90,
  shares: 10,
  createdAt: "2026-07-01T00:00:00.000Z",
} as Trade;

const closedUnreviewed = {
  ...openTrade,
  id: "H002",
  status: "closed",
  closedAt: "2026-07-10T00:00:00.000Z",
  exit: 95,
} as Trade;

const closedNoObs = {
  ...closedUnreviewed,
  id: "H003",
  reviewedAt: "2026-07-11T00:00:00.000Z",
} as Trade;

const expiredPlan = {
  id: "PLAN-001",
  ticker: "NFLX",
  status: "expired",
  analysisTimeframes: ["1D"],
  entryTimeframe: "1D",
  plannedEntry: 900,
  stopPrice: 850,
  targetPrice: 1000,
  plannedRR: 2,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-08T00:00:00.000Z",
} as TradePlan;

const readyPlan = {
  ...expiredPlan,
  id: "PLAN-READY",
  status: "ready",
} as TradePlan;

const windowPlan = {
  ...expiredPlan,
  id: "PLAN-WINDOW",
  status: "watching",
  validUntil: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
} as TradePlan;

const playbooks = [
  { id: "secular-trend-continuation", name: "Secular Trend Continuation", status: "TESTING" },
] as Playbook[];

const inbox = [{ id: "PROP-1", type: "trade-update" }] as unknown as BridgeInboxItem[];

// --- classification + stable IDs (no random) ---
const idCases: Array<[string, string, string]> = [
  ["playbook-H001", "assign_playbook", "ATTN-ASSIGN-PLAYBOOK-H001"],
  ["review-H002", "closed_missing_review", "ATTN-REVIEW-H002"],
  ["incomplete-closed", "incomplete_closed_aggregate", "ATTN-INCOMPLETE-CLOSED"],
  ["inbox", "apply_inbox", "ATTN-INBOX-PROPOSALS"],
  ["plan-review-PLAN-001", "evaluate_expired_plan", "ATTN-EVALUATE-PLAN-PLAN-001"],
  ["plan-ready-PLAN-READY", "plan_ready_enter", "ATTN-ENTER-PLAN-PLAN-READY"],
  ["plan-window-PLAN-WINDOW", "plan_window_closing", "ATTN-PLAN-WINDOW-PLAN-WINDOW"],
  ["observation-H003", "closed_missing_observation", "ATTN-OBSERVATION-H003"],
  ["attribution-H004", "missing_attribution", "ATTN-ATTRIBUTION-H004"],
  ["samples-secular-trend-continuation", "playbook_samples", "ATTN-SAMPLES-SECULAR-TREND-CONTINUATION"],
  ["monthly-loss-limit", "monthly_loss_limit", "ATTN-MONTHLY-LIMIT"],
  ["monthly-loss-warning", "monthly_loss_warning", "ATTN-MONTHLY-WARNING"],
];

for (const [itemId, type, taskId] of idCases) {
  assert.equal(classifyNeedsAttentionTaskType(itemId), type, itemId);
  assert.equal(buildNeedsAttentionTaskId(itemId), taskId, itemId);
  assert.ok(taskId.startsWith("ATTN-"), "stable ATTN prefix");
  assert.ok(!/random|uuid|Math\.random/i.test(taskId));
}

assert.deepEqual(getAllowedApplyBlocksForNeedsAttentionTask("assign_playbook"), ["trade-update"]);
assert.deepEqual(getAllowedApplyBlocksForNeedsAttentionTask("closed_missing_review"), [
  "trade-review",
]);
assert.deepEqual(getAllowedApplyBlocksForNeedsAttentionTask("closed_missing_observation"), [
  "observation-update",
]);
assert.deepEqual(getAllowedApplyBlocksForNeedsAttentionTask("missing_attribution"), [
  "attribution",
]);
assert.deepEqual(getAllowedApplyBlocksForNeedsAttentionTask("evaluate_expired_plan"), []);
assert.deepEqual(getAllowedApplyBlocksForNeedsAttentionTask("playbook_samples"), []);
assert.equal(getNeedsAttentionSnapshotSupport("evaluate_expired_plan"), "UNSUPPORTED");
assert.equal(getNeedsAttentionSnapshotSupport("monthly_loss_limit"), "UNSUPPORTED");
assert.equal(getNeedsAttentionSnapshotSupport("assign_playbook"), "SUPPORTED");

function snap(item: AttentionItem, extra?: Partial<Parameters<typeof buildNeedsAttentionTaskSnapshot>[1]>) {
  return buildNeedsAttentionTaskSnapshot(item, {
    trades: [openTrade, closedUnreviewed, closedNoObs],
    plans: [expiredPlan, readyPlan, windowPlan],
    playbooks,
    pendingInbox: inbox,
    openAttentionCount: 3,
    ...extra,
  });
}

// --- assign_playbook fixture ---
{
  const item: AttentionItem = {
    id: "playbook-H001",
    label: "Assign playbook · H001 AMZN",
    href: "/trades/H001",
    priority: 3,
  };
  const snapshot = snap(item);
  assert.equal(snapshot.task.id, "ATTN-ASSIGN-PLAYBOOK-H001");
  assert.equal(snapshot.task.type, "assign_playbook");
  assert.equal(snapshot.linkedEntities.tradeId, "H001");
  assert.equal(snapshot.linkedEntities.ticker, "AMZN");
  assert.match(snapshot.task.sourceCondition, /no playbookId/);
  assert.equal(snapshot.globalContextSummary?.dashboardSnapshotLabel, "Dashboard snapshot");
  assert.ok(snapshot.aiContract.allowedApplyBlockTypes.includes("trade-update"));
  assert.ok(snapshot.evidence.missing.some((m) => m.field === "playbookId"));
  assert.ok(
    snapshot.evidence.ambiguities.some((a) =>
      a.clarificationNeeded.includes("Do not assign because a name sounds similar")
    )
  );
  assert.equal(validateNeedsAttentionSnapshot(snapshot).length, 0);
  const text = buildNeedsAttentionSnapshotText(snapshot);
  assert.match(text, /ATTN-ASSIGN-PLAYBOOK-H001/);
  assert.match(text, /Dashboard snapshot/);
  assert.match(text, /NON-INVENTION/);
  assert.match(text, /MATRIX TASK DIAGNOSIS/);
  assert.ok(!/\$\{|full dashboard paste/i.test(text));
  assert.ok(
    !text.includes("=== MATRIX DASHBOARD") && !text.includes("Monthly loss limit reached"),
    "must not embed full Dashboard snapshot body"
  );
  assert.match(getNeedsAttentionCompletionCondition("assign_playbook"), /playbookId/);
}

// --- closed_missing_review ---
{
  const snapshot = snap({
    id: "review-H002",
    label: "Review H002",
    href: "/trades/H002/review",
    priority: 1,
  });
  assert.equal(snapshot.task.type, "closed_missing_review");
  assert.equal(snapshot.linkedEntities.tradeId, "H002");
  assert.deepEqual(snapshot.aiContract.allowedApplyBlockTypes, ["trade-review"]);
  assert.ok(snapshot.evidence.missing.some((m) => m.field === "reviewedAt"));
}

// --- apply_inbox ---
{
  const snapshot = snap({
    id: "inbox",
    label: "Apply inbox proposal",
    href: "/inbox",
    priority: 2,
  });
  assert.equal(snapshot.task.id, "ATTN-INBOX-PROPOSALS");
  assert.equal(snapshot.currentState.pendingInboxCount, 1);
  assert.ok(snapshot.linkedEntities.inboxProposalIds?.includes("PROP-1"));
  assert.deepEqual(snapshot.aiContract.allowedApplyBlockTypes, []);
}

// --- evaluate_expired_plan (UNSUPPORTED Apply) ---
{
  const snapshot = snap({
    id: "plan-review-PLAN-001",
    label: "Evaluate expired plan · NFLX",
    href: "/planning?plan=PLAN-001",
    priority: 16,
  });
  assert.equal(snapshot.aiContract.snapshotSupport, "UNSUPPORTED");
  assert.deepEqual(snapshot.aiContract.allowedApplyBlockTypes, []);
  assert.equal(snapshot.linkedEntities.planId, "PLAN-001");
  assert.ok(snapshot.evidence.missing.some((m) => m.field === "plan.outcome"));
  assert.match(snapshot.aiContract.completionCondition, /UNSUPPORTED/);
}

// --- plan_ready / window ---
{
  const ready = snap({
    id: "plan-ready-PLAN-READY",
    label: "Enter plan",
    href: "/planning?plan=PLAN-READY",
    priority: 15,
  });
  assert.deepEqual(ready.aiContract.allowedApplyBlockTypes, ["trade-proposal"]);
  const win = snap({
    id: "plan-window-PLAN-WINDOW",
    label: "Plan window closing",
    href: "/planning?plan=PLAN-WINDOW",
    priority: 17,
  });
  assert.deepEqual(win.aiContract.allowedApplyBlockTypes, ["decision-update"]);
}

// --- observation + attribution ---
{
  const obsSnap = snap({
    id: "observation-H003",
    label: "Observation missing",
    href: "/trades/H003",
    priority: 2,
  });
  assert.deepEqual(obsSnap.aiContract.allowedApplyBlockTypes, ["observation-update"]);
  assert.ok(obsSnap.evidence.missing.some((m) => m.field === "observation"));

  const lo = {
    id: "LO-AMZN-001",
    kind: "executed_loss",
    ticker: "AMZN",
    tradeId: "H003",
    lifecycleStatus: "ready_for_attribution",
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    source: "trade_close",
  } as LearningOutcome;
  const attrSnap = snap(
    {
      id: "attribution-H003",
      label: "Attribution ready",
      href: "/trades/H003",
      priority: 2,
    },
    { learningOutcomes: [lo] }
  );
  assert.deepEqual(attrSnap.aiContract.allowedApplyBlockTypes, ["attribution"]);
  assert.equal(attrSnap.linkedEntities.learningOutcomeId, "LO-AMZN-001");
}

// --- unsupported samples / monthly ---
{
  assert.equal(getNeedsAttentionSnapshotSupport("playbook_samples"), "UNSUPPORTED");
  const monthly = snap({
    id: "monthly-loss-limit",
    label: "Monthly loss limit",
    href: "/stats",
    priority: 0,
  });
  assert.equal(monthly.aiContract.snapshotSupport, "UNSUPPORTED");
  assert.deepEqual(monthly.aiContract.allowedApplyBlockTypes, []);
}

// --- enrichment + library index ---
{
  const enriched = enrichAttentionItemWithAiSnapshot(
    { id: "playbook-H001", label: "x", href: "/trades/H001", priority: 3 },
    { trades: [openTrade], plans: [], playbooks }
  );
  assert.ok(enriched.taskSnapshotText?.includes("ATTN-ASSIGN-PLAYBOOK-H001"));
  const lib = buildLibraryIndexBrief();
  assert.match(lib, /LIBRARY INDEX/);
  assert.match(lib, /Technical Analysis/);
  assert.match(lib, /Learning/);
}

// --- disappearance after underlying mutation (derived queue) ---
{
  const before = buildAttentionItems([openTrade], [], playbooks);
  assert.ok(before.some((i) => i.id === "playbook-H001"));
  const afterAssign = buildAttentionItems(
    [{ ...openTrade, playbookId: "secular-trend-continuation" }],
    [],
    playbooks
  );
  assert.ok(!afterAssign.some((i) => i.id === "playbook-H001"), "assign playbook clears item");

  const beforeReview = buildAttentionItems([closedUnreviewed], [], playbooks);
  assert.ok(beforeReview.some((i) => i.id === "review-H002"));
  const afterReview = buildAttentionItems(
    [{ ...closedUnreviewed, reviewedAt: "2026-07-11T00:00:00.000Z" } as Trade],
    [],
    playbooks
  );
  assert.ok(!afterReview.some((i) => i.id === "review-H002"), "review clears item");

  // Persistence failure simulation: mutation not applied → item remains
  const stillMissing = buildAttentionItems([closedUnreviewed], [], playbooks);
  assert.ok(stillMissing.some((i) => i.id === "review-H002"), "no fake complete without persist");
}

// --- sequential: plan outcome clears evaluate; then learning gaps appear ---
{
  const beforePlans = buildPlanAttentionItems([expiredPlan]);
  assert.ok(beforePlans.some((i) => i.id === "plan-review-PLAN-001"));
  const afterOutcome = buildPlanAttentionItems([
    {
      ...expiredPlan,
      outcome: { recordedAt: "2026-07-12T00:00:00.000Z", strategyStillValid: true },
    },
  ]);
  assert.ok(
    !afterOutcome.some((i) => i.id === "plan-review-PLAN-001"),
    "outcome.recordedAt clears evaluate task"
  );

  const learningBefore = buildLearningAttentionItems([closedNoObs], [], []);
  assert.ok(learningBefore.some((i) => i.id === "observation-H003"));
  const obs = {
    id: "OBS-1",
    tradeId: "H003",
    ticker: "AMZN",
    status: "observing",
    startedAt: "2026-07-10T00:00:00.000Z",
    endsAt: "2026-10-10T00:00:00.000Z",
    durationDays: 90,
    createdAt: "2026-07-10T00:00:00.000Z",
    lastUpdatedAt: "2026-07-10T00:00:00.000Z",
  } as ObservationRecord;
  const learningAfterObs = buildLearningAttentionItems([closedNoObs], [obs], []);
  assert.ok(!learningAfterObs.some((i) => i.id === "observation-H003"));

  const loReady = {
    id: "LO-1",
    kind: "executed_loss",
    ticker: "AMZN",
    tradeId: "H003",
    lifecycleStatus: "ready_for_attribution",
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    source: "trade_close",
  } as LearningOutcome;
  const attrBefore = buildLearningAttentionItems([closedNoObs], [obs], [loReady]);
  assert.ok(attrBefore.some((i) => i.id === "attribution-H003"));
  const attrAfter = buildLearningAttentionItems(
    [closedNoObs],
    [obs],
    [{ ...loReady, mafExperimentId: "MAF-1", lifecycleStatus: "attributed" }]
  );
  assert.ok(!attrAfter.some((i) => i.id === "attribution-H003"));
}

// --- inbox clears when empty ---
{
  const withInbox = buildAttentionItems([], inbox, playbooks);
  assert.ok(withInbox.some((i) => i.id === "inbox"));
  const cleared = buildAttentionItems([], [], playbooks);
  assert.ok(!cleared.some((i) => i.id === "inbox"));
}

// --- missing evidence ⇒ snapshot does not claim READY / does not invent prices ---
{
  const snapshot = snap({
    id: "playbook-H001",
    label: "Assign",
    href: "/trades/H001",
    priority: 3,
  });
  const text = buildNeedsAttentionSnapshotText(snapshot);
  assert.match(text, /none until READY/);
  assert.ok(!/"playbookId"\s*:\s*"secular/.test(text), "must not invent assignment");
  assert.ok(snapshot.evidence.missing.length > 0);
}

console.log("test-needs-attention-ai: ok");
