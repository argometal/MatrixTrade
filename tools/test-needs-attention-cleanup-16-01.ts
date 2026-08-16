/**
 * PROMPT 16-01 — Needs Attention cleanup: human intervention only.
 */
import assert from "node:assert/strict";
import { buildAttentionItems } from "../lib/dashboard-attention";
import { buildPlanAttentionItems } from "../lib/plan-attention";
import { buildLearningAttentionItems } from "../lib/learning-attention";
import { buildExpiredReservationAttentionItems } from "../lib/capital-account";
import {
  enrichAttentionItemsWithAiSnapshots,
  getAllowedApplyBlocksForNeedsAttentionTask,
} from "../lib/needs-attention-ai";
import type { Trade } from "../lib/types";
import type { TradePlan } from "../lib/plan-types";
import type { Playbook } from "../lib/playbook-types";
import type { MonthlyRisk } from "../lib/monthly-risk";
import type { BridgeInboxItem } from "../lib/bridge";
import type { CapitalReservation } from "../lib/capital-types";
import type { LearningOutcome } from "../lib/learning-outcome-types";
import type { ObservationRecord } from "../lib/observation-types";

const playbooks = [
  {
    id: "secular-trend-continuation",
    name: "Secular Trend Continuation",
    status: "TESTING",
  },
] as Playbook[];

const monthlyBreached = {
  monthKey: "2026-07",
  monthlyAllowance: 300,
  monthlyLossRoom: 0,
  monthlyCapBreached: true,
} as MonthlyRisk;

const monthlyWarning = {
  monthKey: "2026-07",
  monthlyAllowance: 300,
  monthlyLossRoom: 50,
  monthlyCapBreached: false,
} as MonthlyRisk;

const closedNoPb = {
  id: "H010",
  ticker: "AMZN",
  status: "closed",
  entry: 100,
  stop: 90,
  shares: 10,
  exit: 95,
  closedAt: "2026-07-10T00:00:00.000Z",
  reviewedAt: "2026-07-11T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
} as Trade;

const openNoPb = {
  ...closedNoPb,
  id: "H011",
  status: "open",
  exit: undefined,
  closedAt: undefined,
  reviewedAt: undefined,
} as Trade;

const inbox = [
  {
    id: "PROP-A",
    status: "pending",
    receivedAt: "2026-07-20T00:00:00.000Z",
    payload: { type: "trade-update" },
    origin: "supabase",
  },
] as BridgeInboxItem[];

const expiredPlan = {
  id: "PLAN-EXP",
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

const readyPlan = { ...expiredPlan, id: "PLAN-READY", status: "ready" } as TradePlan;
const windowPlan = {
  ...expiredPlan,
  id: "PLAN-WINDOW",
  status: "watching",
  validUntil: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
} as TradePlan;

const failedSyncPlan = {
  ...expiredPlan,
  id: "PLAN-SYNC-FAIL",
  outcome: {
    recordedAt: "2026-07-12T00:00:00.000Z",
    strategyStillValid: true,
    learningSyncStatus: "failed",
    learningSyncError: "simulated",
  },
} as TradePlan;

const pendingSyncPlan = {
  ...expiredPlan,
  id: "PLAN-SYNC-PEND",
  outcome: {
    recordedAt: "2026-07-12T00:00:00.000Z",
    strategyStillValid: true,
    learningSyncStatus: "pending",
  },
} as TradePlan;

const reservation: CapitalReservation = {
  id: "CAPRES-PLAN-EXP",
  planId: "PLAN-EXP",
  ticker: "NFLX",
  status: "reserved",
  requestedCapital: 4000,
  reservedCapital: 4000,
  estimatedRisk: 200,
  expiresAt: "2020-01-01T00:00:00.000Z",
  fundingDecision: "fully_funded",
  blockingReasons: [],
  createdAt: "2020-01-01T00:00:00.000Z",
  updatedAt: "2020-01-01T00:00:00.000Z",
};

// --- Removed from queue ---
{
  const withSamplesTrade = {
    ...closedNoPb,
    id: "H012",
    playbookId: "secular-trend-continuation",
  } as Trade;
  const items = buildAttentionItems(
    [withSamplesTrade],
    [],
    playbooks,
    monthlyBreached
  );
  assert.ok(!items.some((i) => i.id.startsWith("samples-")), "no samples ATTN");
  assert.ok(!items.some((i) => i.id === "monthly-loss-limit"), "no monthly limit ATTN");
  const warnItems = buildAttentionItems([], [], playbooks, monthlyWarning);
  assert.ok(!warnItems.some((i) => i.id === "monthly-loss-warning"), "no monthly warning ATTN");

  const planItems = buildPlanAttentionItems([readyPlan, windowPlan, expiredPlan]);
  assert.ok(!planItems.some((i) => i.id.startsWith("plan-ready-")), "no enter-plan ATTN");
  assert.ok(!planItems.some((i) => i.id.startsWith("plan-window-")), "no window ATTN");
  assert.ok(planItems.some((i) => i.id === "plan-review-PLAN-EXP"), "keep evaluate terminal");
}

// --- Keep: inbox, assign closed playbook, review, CAPRES, learning ---
{
  const base = buildAttentionItems([closedNoPb, openNoPb, {
    ...closedNoPb,
    id: "H013",
    reviewedAt: undefined,
  } as Trade], inbox, playbooks);
  assert.ok(base.some((i) => i.id === "inbox"));
  assert.ok(base.some((i) => i.id === "playbook-H010"), "closed missing playbook");
  assert.ok(!base.some((i) => i.id === "playbook-H011"), "open missing playbook excluded");
  assert.ok(base.some((i) => i.id === "review-H013") || base.some((i) => i.id === "incomplete-closed"));

  const cap = buildExpiredReservationAttentionItems([reservation]);
  assert.equal(cap.length, 1);
  assert.equal(cap[0].id, "capital-reservation-expired-CAPRES-PLAN-EXP");

  const obsItems = buildLearningAttentionItems(
    [closedNoPb],
    [],
    [
      {
        id: "LO-1",
        kind: "executed_loss",
        ticker: "AMZN",
        tradeId: "H010",
        lifecycleStatus: "ready_for_attribution",
        createdAt: "2026-07-10T00:00:00.000Z",
        updatedAt: "2026-07-10T00:00:00.000Z",
        source: "trade_close",
      } as LearningOutcome,
    ]
  );
  assert.ok(obsItems.some((i) => i.id === "observation-H010"));
  assert.ok(obsItems.some((i) => i.id === "attribution-H010"));
}

// --- Learning sync: pending hidden; failed shown; not framed as Apply ---
{
  const pendingOnly = buildPlanAttentionItems([pendingSyncPlan], [], []);
  assert.ok(
    !pendingOnly.some((i) => i.id === "plan-outcome-sync-PLAN-SYNC-PEND"),
    "pending sync is not human ATTN (auto-retry owns it)"
  );
  const failed = buildPlanAttentionItems([failedSyncPlan], [], []);
  const syncItem = failed.find((i) => i.id === "plan-outcome-sync-PLAN-SYNC-FAIL");
  assert.ok(syncItem);
  assert.match(syncItem!.label, /Learning Sync failed/);
  assert.deepEqual(getAllowedApplyBlocksForNeedsAttentionTask("sync_plan_outcome_learning"), []);
}

// --- Enrich: Apply only when allowed blocks; CAPRES prefills release ---
{
  const raw = [
    ...buildAttentionItems([closedNoPb], inbox, playbooks),
    ...buildPlanAttentionItems([expiredPlan, failedSyncPlan], [], []),
    ...buildExpiredReservationAttentionItems([reservation]).map((item) => ({
      id: item.id,
      label: item.title,
      href: "/planning/capital",
      priority: item.priority,
    })),
  ];
  const enriched = enrichAttentionItemsWithAiSnapshots(raw, {
    trades: [closedNoPb],
    plans: [expiredPlan, failedSyncPlan],
    playbooks,
    pendingInbox: inbox,
    reservations: [reservation],
    observations: [] as ObservationRecord[],
    learningOutcomes: [],
  });

  const byId = Object.fromEntries(enriched.map((i) => [i.id, i]));

  assert.equal((byId.inbox?.allowedApplyBlockTypes ?? []).length, 0, "inbox: no Apply");
  assert.ok(
    (byId["plan-outcome-sync-PLAN-SYNC-FAIL"]?.allowedApplyBlockTypes ?? []).length === 0,
    "sync failed: no Apply block"
  );
  assert.ok(
    (byId["plan-review-PLAN-EXP"]?.allowedApplyBlockTypes ?? []).includes("plan-outcome")
  );
  assert.ok(
    (byId["playbook-H010"]?.allowedApplyBlockTypes ?? []).includes("trade-update")
  );

  const cap = byId["capital-reservation-expired-CAPRES-PLAN-EXP"];
  assert.ok(cap);
  assert.ok(cap.allowedApplyBlockTypes?.includes("capital-reservation-release"));
  assert.ok(cap.suggestedApplyJson?.includes('"type": "capital-reservation-release"'));
  assert.ok(cap.suggestedApplyJson?.includes("CAPRES-PLAN-EXP"));
  assert.equal(cap.href, "/planning/capital");

  // Report shape for humans: each remaining row + concrete actions
  const report = enriched.map((i) => ({
    id: i.id,
    taskType: i.taskType,
    label: i.label,
    go: i.href,
    applyBlocks: i.allowedApplyBlockTypes ?? [],
    hasSuggestedApply: Boolean(i.suggestedApplyJson),
    copy: Boolean(i.taskSnapshotText),
  }));
  assert.ok(report.length >= 3);
  console.log(
    "16-01 attention report (fixture):",
    JSON.stringify(report, null, 2)
  );
}

console.log("test-needs-attention-cleanup-16-01: ok");
