import type { BridgeInboxItem } from "./bridge";
import type { AttentionItem } from "./dashboard-attention";
import type { MonthlyRisk } from "./monthly-risk";
import type { ObservationRecord } from "./observation-types";
import type { LearningOutcome } from "./learning-outcome-types";
import type { Playbook } from "./playbook-types";
import type { TradePlan } from "./plan-types";
import type { StockThesis } from "./stock-thesis-types";
import type { Experiment, Trade } from "./types";
import {
  classifyIncompleteClosedTrade,
  formatIncompleteClosedSummary,
  listIncompleteClosedTrades,
} from "./incomplete-closed-trades";
import { isTradeReviewed } from "./review";
import { planNeedsStrategyReview } from "./plan-helpers";
import {
  NEEDS_ATTENTION_AI_STATUSES,
  NEEDS_ATTENTION_SNAPSHOT_VERSION,
  type NeedsAttentionLinkedEntities,
  type NeedsAttentionPriority,
  type NeedsAttentionSnapshot,
  type NeedsAttentionTaskType,
} from "./needs-attention-types";
import { wrapSnapshotText } from "./snapshot-verification";

export type NeedsAttentionBuildContext = {
  trades: Trade[];
  plans: TradePlan[];
  playbooks: Playbook[];
  stockTheses?: StockThesis[];
  observations?: ObservationRecord[];
  learningOutcomes?: LearningOutcome[];
  pendingInbox?: BridgeInboxItem[];
  monthly?: MonthlyRisk;
  experiment?: Experiment;
  openAttentionCount?: number;
};

const FORBIDDEN = [
  "Invent prices, dates, fills, sizes, MFE/MAE, targets reached, or invalidation events",
  "Invent Playbook assignments or classifications as facts",
  "Invent entity IDs or user decisions",
  "Output Apply JSON before STATUS: READY with zero unverified assumptions",
  "Output multiple mutation blocks in one response",
];

export function classifyNeedsAttentionTaskType(itemId: string): NeedsAttentionTaskType {
  if (itemId === "monthly-loss-limit") return "monthly_loss_limit";
  if (itemId === "monthly-loss-warning") return "monthly_loss_warning";
  if (itemId === "incomplete-closed") return "incomplete_closed_aggregate";
  if (itemId === "inbox") return "apply_inbox";
  if (itemId.startsWith("review-")) return "closed_missing_review";
  if (itemId.startsWith("playbook-")) return "assign_playbook";
  if (itemId.startsWith("samples-")) return "playbook_samples";
  if (itemId.startsWith("plan-review-")) return "evaluate_expired_plan";
  if (itemId.startsWith("plan-ready-")) return "plan_ready_enter";
  if (itemId.startsWith("plan-window-")) return "plan_window_closing";
  if (itemId.startsWith("observation-")) return "closed_missing_observation";
  if (itemId.startsWith("attribution-")) return "missing_attribution";
  return "unknown";
}

/** Stable derived task IDs — never random. */
export function buildNeedsAttentionTaskId(itemId: string): string {
  const type = classifyNeedsAttentionTaskType(itemId);
  switch (type) {
    case "assign_playbook":
      return `ATTN-ASSIGN-PLAYBOOK-${itemId.replace(/^playbook-/, "").toUpperCase()}`;
    case "closed_missing_review":
      return `ATTN-REVIEW-${itemId.replace(/^review-/, "").toUpperCase()}`;
    case "incomplete_closed_aggregate":
      return "ATTN-INCOMPLETE-CLOSED";
    case "apply_inbox":
      return "ATTN-INBOX-PROPOSALS";
    case "evaluate_expired_plan":
      return `ATTN-EVALUATE-PLAN-${itemId.replace(/^plan-review-/, "").toUpperCase()}`;
    case "plan_ready_enter":
      return `ATTN-ENTER-PLAN-${itemId.replace(/^plan-ready-/, "").toUpperCase()}`;
    case "plan_window_closing":
      return `ATTN-PLAN-WINDOW-${itemId.replace(/^plan-window-/, "").toUpperCase()}`;
    case "closed_missing_observation":
      return `ATTN-OBSERVATION-${itemId.replace(/^observation-/, "").toUpperCase()}`;
    case "missing_attribution":
      return `ATTN-ATTRIBUTION-${itemId.replace(/^attribution-/, "").toUpperCase()}`;
    case "playbook_samples":
      return `ATTN-SAMPLES-${itemId.replace(/^samples-/, "").toUpperCase()}`;
    case "monthly_loss_limit":
      return "ATTN-MONTHLY-LIMIT";
    case "monthly_loss_warning":
      return "ATTN-MONTHLY-WARNING";
    default:
      return `ATTN-UNKNOWN-${itemId.toUpperCase().replace(/[^A-Z0-9-]/g, "")}`;
  }
}

export function getAllowedApplyBlocksForNeedsAttentionTask(
  type: NeedsAttentionTaskType
): string[] {
  switch (type) {
    case "assign_playbook":
      return ["trade-update"];
    case "closed_missing_review":
      return ["trade-review"];
    case "incomplete_closed_aggregate":
      return ["trade-review", "trade-update", "observation-update"];
    case "apply_inbox":
      return []; // review existing proposals in Control — do not invent a bulk block
    case "evaluate_expired_plan":
      // Gap: plan.outcome is persisted only via recordPlanOutcome (Planning UI).
      // No Apply block sets outcome.recordedAt — do not force-fit decision-update.
      return [];
    case "plan_ready_enter":
      return ["trade-proposal"];
    case "plan_window_closing":
      return ["decision-update"];
    case "closed_missing_observation":
      return ["observation-update"];
    case "missing_attribution":
      return ["attribution"];
    case "playbook_samples":
    case "monthly_loss_limit":
    case "monthly_loss_warning":
      return [];
    default:
      return [];
  }
}

export function getNeedsAttentionCompletionCondition(type: NeedsAttentionTaskType): string {
  switch (type) {
    case "assign_playbook":
      return "Trade.playbookId is set (persisted).";
    case "closed_missing_review":
      return "Trade.reviewedAt is set via trade-review.";
    case "incomplete_closed_aggregate":
      return "Every closed incomplete trade has review + required learning fields.";
    case "apply_inbox":
      return "No unapplied inbox proposals remain.";
    case "evaluate_expired_plan":
      return "UNSUPPORTED via Apply today — Plan.outcome.recordedAt must be set (Planning UI recordPlanOutcome). After that, LO/OBS/MAF gaps appear as separate derived tasks.";
    case "plan_ready_enter":
      return "Plan left ready (entered) or trade-proposal accepted for this plan.";
    case "plan_window_closing":
      return "validUntil extended, plan entered/terminal, or window no longer ≤48h.";
    case "closed_missing_observation":
      return "ObservationRecord exists for the trade (observation-update / ensure OBS).";
    case "missing_attribution":
      return "Learning Outcome attributed (mafExperimentId / lifecycle attributed).";
    case "playbook_samples":
      return "UNSUPPORTED via Apply — need ≥3 closed trades on the TESTING playbook.";
    case "monthly_loss_limit":
    case "monthly_loss_warning":
      return "UNSUPPORTED via Apply — monthly risk room / calendar reset.";
    default:
      return "Underlying source condition becomes false.";
  }
}

export function getNeedsAttentionSnapshotSupport(
  type: NeedsAttentionTaskType
): "SUPPORTED" | "UNSUPPORTED" | "SUMMARY" {
  switch (type) {
    case "evaluate_expired_plan":
    case "playbook_samples":
    case "monthly_loss_limit":
    case "monthly_loss_warning":
      return "UNSUPPORTED";
    case "incomplete_closed_aggregate":
      return "SUMMARY";
    default:
      return "SUPPORTED";
  }
}

function priorityFromNumber(n: number): NeedsAttentionPriority {
  if (n <= 0) return "critical";
  if (n <= 1) return "high";
  if (n <= 3) return "normal";
  return "low";
}

function findTrade(ctx: NeedsAttentionBuildContext, tradeId?: string): Trade | undefined {
  if (!tradeId) return undefined;
  return ctx.trades.find((t) => t.id.toUpperCase() === tradeId.toUpperCase());
}

function findPlan(ctx: NeedsAttentionBuildContext, planId?: string): TradePlan | undefined {
  if (!planId) return undefined;
  return ctx.plans.find((p) => p.id.toUpperCase() === planId.toUpperCase());
}

function findThesisForTicker(
  ctx: NeedsAttentionBuildContext,
  ticker?: string
): StockThesis | undefined {
  if (!ticker || !ctx.stockTheses) return undefined;
  const t = ticker.toUpperCase();
  return ctx.stockTheses.find((row) => row.ticker.toUpperCase() === t);
}

function extractEntityIds(itemId: string, type: NeedsAttentionTaskType): NeedsAttentionLinkedEntities {
  if (type === "assign_playbook") return { tradeId: itemId.replace(/^playbook-/, "").toUpperCase() };
  if (type === "closed_missing_review")
    return { tradeId: itemId.replace(/^review-/, "").toUpperCase() };
  if (type === "evaluate_expired_plan")
    return { planId: itemId.replace(/^plan-review-/, "").toUpperCase() };
  if (type === "plan_ready_enter")
    return { planId: itemId.replace(/^plan-ready-/, "").toUpperCase() };
  if (type === "plan_window_closing")
    return { planId: itemId.replace(/^plan-window-/, "").toUpperCase() };
  if (type === "closed_missing_observation")
    return { tradeId: itemId.replace(/^observation-/, "").toUpperCase() };
  if (type === "missing_attribution") {
    const rest = itemId.replace(/^attribution-/, "").toUpperCase();
    if (rest.startsWith("LO-") || rest.startsWith("LO")) return { learningOutcomeId: rest };
    return { tradeId: rest };
  }
  if (type === "playbook_samples")
    return { playbookId: itemId.replace(/^samples-/, "") };
  return {};
}

export function getNeedsAttentionGlobalContextSummary(
  ctx: NeedsAttentionBuildContext
): NeedsAttentionSnapshot["globalContextSummary"] {
  const m = ctx.monthly;
  return {
    monthlyBudget: m?.monthlyAllowance,
    carryoverAvailable: m?.carryoverIn,
    spentThisMonth: m?.lossUsedThisMonth,
    currentMonthPL: m?.monthlyRealizedPnL ?? ctx.experiment?.realizedPnL,
    openAttentionCount: ctx.openAttentionCount,
    currentPortfolioRisk: m ? m.monthlyAllowance - m.monthlyLossRoom : undefined,
    dashboardSnapshotLabel: "Dashboard snapshot",
  };
}

export function buildNeedsAttentionTaskSnapshot(
  item: AttentionItem,
  ctx: NeedsAttentionBuildContext
): NeedsAttentionSnapshot {
  const type = classifyNeedsAttentionTaskType(item.id);
  const taskId = buildNeedsAttentionTaskId(item.id);
  const linked = extractEntityIds(item.id, type);
  const trade = findTrade(ctx, linked.tradeId);
  const plan =
    findPlan(ctx, linked.planId) ??
    (trade?.planId ? findPlan(ctx, trade.planId) : undefined);
  const thesis = findThesisForTicker(ctx, trade?.ticker ?? plan?.ticker);
  const observation =
    trade && ctx.observations
      ? ctx.observations.find((o) => o.tradeId?.toUpperCase() === trade.id.toUpperCase())
      : undefined;
  const lo =
    ctx.learningOutcomes?.find(
      (row) =>
        (linked.learningOutcomeId &&
          row.id.toUpperCase() === linked.learningOutcomeId.toUpperCase()) ||
        (trade && row.tradeId?.toUpperCase() === trade.id.toUpperCase()) ||
        (plan && row.planId?.toUpperCase() === plan.id.toUpperCase())
    ) ?? undefined;

  if (trade) {
    linked.ticker = trade.ticker;
    linked.tradeId = trade.id;
    if (trade.planId) linked.planId = trade.planId;
    if (trade.playbookId) linked.playbookId = trade.playbookId;
  }
  if (plan) {
    linked.ticker = linked.ticker ?? plan.ticker;
    linked.planId = plan.id;
    if (plan.stockThesisId) linked.stockFileId = plan.stockThesisId;
    if (plan.playbookId) linked.playbookId = plan.playbookId;
  }
  if (thesis) linked.stockFileId = thesis.id;
  if (observation) linked.observationId = observation.id;
  if (lo) {
    linked.learningOutcomeId = lo.id;
    if (lo.mafExperimentId) linked.mafExperimentId = lo.mafExperimentId;
    if (lo.observationId) linked.observationId = lo.observationId;
  }
  if (type === "apply_inbox" && ctx.pendingInbox?.length) {
    linked.inboxProposalIds = ctx.pendingInbox.map((p) => p.id).slice(0, 20);
  }

  const available: NeedsAttentionSnapshot["evidence"]["available"] = [];
  const missing: NeedsAttentionSnapshot["evidence"]["missing"] = [];
  const ambiguities: NeedsAttentionSnapshot["evidence"]["ambiguities"] = [];
  const currentState: Record<string, unknown> = {
    attentionItemId: item.id,
    href: item.href,
    label: item.label,
  };

  if (trade) {
    currentState.trade = {
      id: trade.id,
      ticker: trade.ticker,
      status: trade.status,
      playbookId: trade.playbookId ?? null,
      planId: trade.planId ?? null,
      reviewed: isTradeReviewed(trade),
      entry: trade.entry,
      stop: trade.stop,
      target: trade.target ?? null,
      exit: trade.exit ?? null,
      closedAt: trade.closedAt ?? null,
    };
    available.push({
      field: "trade.status",
      value: trade.status,
      source: "Trade store",
      verified: true,
    });
    if (!trade.playbookId && type === "assign_playbook") {
      missing.push({
        field: "playbookId",
        reason: "Not assigned",
        requiredFor: "assign_playbook completion",
      });
    }
    if (trade.status === "closed" && !isTradeReviewed(trade)) {
      missing.push({
        field: "reviewedAt",
        reason: "Review not saved",
        requiredFor: "closed_missing_review",
      });
    }
    if (trade.status === "closed") {
      const gaps = classifyIncompleteClosedTrade(trade);
      if (gaps.length) {
        currentState.incompleteGaps = gaps;
      }
    }
  }

  if (plan) {
    currentState.plan = {
      id: plan.id,
      ticker: plan.ticker,
      status: plan.status,
      plannedEntry: plan.plannedEntry ?? null,
      stopPrice: plan.stopPrice ?? null,
      targetPrice: plan.targetPrice ?? null,
      supportLevel: plan.supportLevel ?? null,
      plannedRR: plan.plannedRR ?? null,
      validFrom: plan.validFrom ?? null,
      validUntil: plan.validUntil ?? null,
      thesis: plan.thesis ?? null,
      outcome: plan.outcome
        ? {
            recordedAt: plan.outcome.recordedAt,
            reason: plan.outcome.reason ?? null,
            strategyStillValid: plan.outcome.strategyStillValid ?? null,
          }
        : null,
      needsStrategyReview: planNeedsStrategyReview(plan),
      decisionVerdict: plan.decision?.verdict ?? null,
      decisionHistoryLen: plan.decisionHistory?.length ?? 0,
      scoutLifecycle: plan.scoutLifecycle ?? null,
      linkedTradeId: plan.linkedTradeId ?? null,
    };
    available.push({
      field: "plan.status",
      value: plan.status,
      source: "Plan store",
      verified: true,
    });
    if (planNeedsStrategyReview(plan)) {
      missing.push({
        field: "plan.outcome",
        reason:
          "Terminal plan without recorded outcome — no Apply block persists outcome.recordedAt (use Planning UI until plan-outcome exists)",
        requiredFor: "evaluate_expired_plan",
      });
      ambiguities.push({
        field: "capability",
        alternatives: [
          "Planning UI → recordPlanOutcomeAction",
          "Future Apply block: plan-outcome (not shipped)",
        ],
        clarificationNeeded:
          "Do not invent a JSON workaround. STATUS must be UNSUPPORTED for Apply until plan-outcome ships.",
      });
    }
  }

  if (observation) {
    available.push({
      field: "observation.id",
      value: observation.id,
      source: "Observation store",
      verified: true,
    });
    currentState.observation = {
      id: observation.id,
      status: observation.status,
      targetReached: observation.targetReached ?? null,
      mfe: observation.mfe ?? null,
      mae: observation.mae ?? null,
    };
  } else if (type === "closed_missing_observation" && trade) {
    missing.push({
      field: "observation",
      reason: "No ObservationRecord for closed trade",
      requiredFor: "observation-update",
    });
  }

  if (lo) {
    currentState.learningOutcome = {
      id: lo.id,
      kind: lo.kind,
      lifecycleStatus: lo.lifecycleStatus,
      mafExperimentId: lo.mafExperimentId ?? null,
    };
    available.push({
      field: "learningOutcome.lifecycleStatus",
      value: lo.lifecycleStatus,
      source: "Learning Outcome store",
      verified: true,
    });
    if (type === "missing_attribution" && !lo.mafExperimentId) {
      missing.push({
        field: "mafExperimentId",
        reason: "Ready for attribution but no MAF experiment linked",
        requiredFor: "attribution",
      });
    }
  }

  if (type === "assign_playbook") {
    currentState.availablePlaybooks = ctx.playbooks.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
    }));
    ambiguities.push({
      field: "playbookId",
      alternatives: ctx.playbooks.map((p) => p.id),
      clarificationNeeded:
        "Which Playbook was actually intended? Do not assign because a name sounds similar.",
    });
  }

  if (type === "apply_inbox") {
    currentState.pendingInboxCount = ctx.pendingInbox?.length ?? 0;
    available.push({
      field: "pendingInbox.count",
      value: ctx.pendingInbox?.length ?? 0,
      source: "Inbox",
      verified: true,
    });
  }

  if (type === "incomplete_closed_aggregate") {
    const rows = listIncompleteClosedTrades(ctx.trades);
    currentState.incompleteClosed = rows.map((r) => ({
      tradeId: r.trade.id,
      ticker: r.trade.ticker,
      gaps: formatIncompleteClosedSummary(r),
    }));
  }

  const allowed = getAllowedApplyBlocksForNeedsAttentionTask(type);
  const support = getNeedsAttentionSnapshotSupport(type);
  const sourceCondition = describeSourceCondition(type, item, trade, plan, lo);

  return {
    snapshotType: "matrix-needs-attention",
    snapshotVersion: NEEDS_ATTENTION_SNAPSHOT_VERSION,
    task: {
      id: taskId,
      type,
      title: item.label,
      reason: sourceCondition,
      priority: priorityFromNumber(item.priority),
      sourceCondition,
    },
    linkedEntities: linked,
    globalContextSummary: getNeedsAttentionGlobalContextSummary(ctx),
    currentState,
    evidence: { available, missing, ambiguities },
    aiContract: {
      firstResponseRequired: true,
      allowedStatuses: [...NEEDS_ATTENTION_AI_STATUSES],
      allowedApplyBlockTypes: allowed,
      forbiddenAssumptions: FORBIDDEN,
      completionCondition: getNeedsAttentionCompletionCondition(type),
      snapshotSupport: support,
      availableVisibleBlocks: {
        dashboardSnapshot: "Dashboard snapshot",
        mechanics: "Matrix Mechanics",
        libraryIndex: "Library Index",
      },
    },
    instructions: [
      "Respond first with MATRIX TASK DIAGNOSIS (STATUS before any JSON).",
      "If NEEDS_MECHANICS: ask human to copy the visible block Matrix Mechanics.",
      "If NEEDS_LIBRARY: ask for Library Index, then one exact Library section.",
      "If NEEDS_DATA: ask precise factual questions — never invent answers.",
      "Only when READY with zero unverified assumptions: output ONE Apply-ready JSON block.",
      "Paste into Control → Apply → Validate → Accept.",
      "Full global context is available under the visible label: Dashboard snapshot.",
      "Do not embed or request a duplicate of this entire Dashboard inside the task reply.",
    ],
  };
}

function describeSourceCondition(
  type: NeedsAttentionTaskType,
  item: AttentionItem,
  trade?: Trade,
  plan?: TradePlan,
  lo?: LearningOutcome
): string {
  switch (type) {
    case "assign_playbook":
      return `Trade ${trade?.id ?? "?"} has no playbookId`;
    case "closed_missing_review":
      return `Trade ${trade?.id ?? "?"} is closed without reviewedAt`;
    case "incomplete_closed_aggregate":
      return "One or more closed trades have incomplete learning fields";
    case "apply_inbox":
      return "Pending unapplied inbox proposals exist";
    case "evaluate_expired_plan":
      return `Plan ${plan?.id ?? "?"} is ${plan?.status ?? "terminal"} without outcome.recordedAt`;
    case "plan_ready_enter":
      return `Plan ${plan?.id ?? "?"} status is ready`;
    case "plan_window_closing":
      return `Plan ${plan?.id ?? "?"} watching window closes within 48h`;
    case "closed_missing_observation":
      return `Closed trade ${trade?.id ?? "?"} has no ObservationRecord`;
    case "missing_attribution":
      return `Learning Outcome ${lo?.id ?? "?"} is ready_for_attribution without MAF experiment`;
    case "playbook_samples":
      return item.label;
    case "monthly_loss_limit":
      return "Monthly loss cap breached";
    case "monthly_loss_warning":
      return "Monthly loss room ≤ 25% of allowance";
    default:
      return item.label;
  }
}

function formatEvidenceList(
  title: string,
  rows: Array<{ field: string; value?: unknown; reason?: string; requiredFor?: string }>
): string[] {
  if (!rows.length) return [`${title}`, "(none)"];
  const lines = [title];
  for (const row of rows) {
    if (row.reason) {
      lines.push(`- ${row.field}: ${row.reason}${row.requiredFor ? ` [${row.requiredFor}]` : ""}`);
    } else {
      lines.push(`- ${row.field}: ${JSON.stringify(row.value)}`);
    }
  }
  return lines;
}

export function buildNeedsAttentionSnapshotText(snapshot: NeedsAttentionSnapshot): string {
  const g = snapshot.globalContextSummary;
  const lines = [
    "=== MATRIX NEEDS ATTENTION TASK SNAPSHOT ===",
    "",
    "SNAPSHOT",
    `type: ${snapshot.snapshotType}`,
    `version: ${snapshot.snapshotVersion}`,
    `support: ${snapshot.aiContract.snapshotSupport}`,
    "",
    "TASK",
    `id: ${snapshot.task.id}`,
    `type: ${snapshot.task.type}`,
    `title: ${snapshot.task.title}`,
    `reason: ${snapshot.task.reason}`,
    `priority: ${snapshot.task.priority ?? "normal"}`,
    `sourceCondition: ${snapshot.task.sourceCondition}`,
    "",
    "LINKED ENTITIES",
    ...Object.entries(snapshot.linkedEntities).map(
      ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(",") : (v ?? "")}`
    ),
    "",
    "GLOBAL CONTEXT SUMMARY",
    `monthlyBudget: ${g?.monthlyBudget ?? ""}`,
    `carryoverAvailable: ${g?.carryoverAvailable ?? ""}`,
    `spentThisMonth: ${g?.spentThisMonth ?? ""}`,
    `currentMonthPL: ${g?.currentMonthPL ?? ""}`,
    `openAttentionCount: ${g?.openAttentionCount ?? ""}`,
    `currentPortfolioRisk: ${g?.currentPortfolioRisk ?? ""}`,
    "Full global context is available from the visible Matrix block:",
    "Dashboard snapshot",
    "",
    "CURRENT STATE",
    JSON.stringify(snapshot.currentState, null, 2),
    "",
    ...formatEvidenceList(
      "VERIFIED EVIDENCE",
      snapshot.evidence.available.map((e) => ({ field: e.field, value: e.value }))
    ),
    "",
    ...formatEvidenceList(
      "MISSING DATA",
      snapshot.evidence.missing.map((e) => ({
        field: e.field,
        reason: e.reason,
        requiredFor: e.requiredFor,
      }))
    ),
    "",
    "AMBIGUITIES",
    ...(snapshot.evidence.ambiguities.length === 0
      ? ["(none)"]
      : snapshot.evidence.ambiguities.map(
          (a) =>
            `- ${a.field}: ${a.clarificationNeeded} (alternatives: ${a.alternatives.join(", ")})`
        )),
    "",
    "ALLOWED APPLY BLOCKS",
    ...(snapshot.aiContract.allowedApplyBlockTypes.length
      ? snapshot.aiContract.allowedApplyBlockTypes.map((b) => `- ${b}`)
      : ["- (none — UNSUPPORTED or operational inbox review only)"]),
    "",
    "COMPLETION CONDITION",
    snapshot.aiContract.completionCondition,
    "",
    "AVAILABLE CONTEXT BLOCKS",
    `- ${snapshot.aiContract.availableVisibleBlocks.dashboardSnapshot}`,
    `- ${snapshot.aiContract.availableVisibleBlocks.mechanics}`,
    `- ${snapshot.aiContract.availableVisibleBlocks.libraryIndex}`,
    "",
    "AI NON-INVENTION RULE",
    ...snapshot.aiContract.forbiddenAssumptions.map((f) => `- ${f}`),
    "",
    "AI FIRST RESPONSE CONTRACT",
    "Diagnose readiness before generating JSON.",
    "MATRIX TASK DIAGNOSIS",
    "STATUS: READY | NEEDS_MECHANICS | NEEDS_LIBRARY | NEEDS_DATA | AMBIGUOUS | UNSUPPORTED",
    "TASK: <one sentence>",
    "UNDERSTANDING: <brief>",
    "VERIFIED EVIDENCE: ...",
    "MISSING OR AMBIGUOUS: ...",
    "NEXT REQUIRED INPUT: exact visible block label OR factual question",
    "INTENDED APPLY BLOCK: none until READY | one existing type",
    "COMPLETION CONDITION: ...",
    "UNVERIFIED ASSUMPTIONS: none | list",
    "",
    "INSTRUCTIONS",
    ...snapshot.instructions.map((i) => `- ${i}`),
  ];

  return wrapSnapshotText(`NEEDS ATTENTION ${snapshot.task.id}`, lines.join("\n"));
}

export function enrichAttentionItemWithAiSnapshot(
  item: AttentionItem,
  ctx: NeedsAttentionBuildContext
): AttentionItem {
  const snapshot = buildNeedsAttentionTaskSnapshot(item, ctx);
  return {
    ...item,
    taskId: snapshot.task.id,
    taskType: snapshot.task.type,
    taskSnapshotText: buildNeedsAttentionSnapshotText(snapshot),
  };
}

export function enrichAttentionItemsWithAiSnapshots(
  items: AttentionItem[],
  ctx: NeedsAttentionBuildContext
): AttentionItem[] {
  const withCount = { ...ctx, openAttentionCount: items.length };
  return items.map((item) => enrichAttentionItemWithAiSnapshot(item, withCount));
}

export function validateNeedsAttentionSnapshot(snapshot: NeedsAttentionSnapshot): string[] {
  const errors: string[] = [];
  if (snapshot.snapshotType !== "matrix-needs-attention") {
    errors.push("snapshotType must be matrix-needs-attention");
  }
  if (!snapshot.task.id.startsWith("ATTN-")) {
    errors.push("task.id must be a stable ATTN- derived id");
  }
  if (!snapshot.aiContract.firstResponseRequired) {
    errors.push("firstResponseRequired must be true");
  }
  if (snapshot.globalContextSummary?.dashboardSnapshotLabel !== "Dashboard snapshot") {
    errors.push("must reference Dashboard snapshot label");
  }
  return errors;
}
