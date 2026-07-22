/** Needs Attention AI task snapshot — derived queue, not a parallel workflow DB. */

export const NEEDS_ATTENTION_SNAPSHOT_VERSION = 1;

export const NEEDS_ATTENTION_AI_STATUSES = [
  "READY",
  "NEEDS_MECHANICS",
  "NEEDS_LIBRARY",
  "NEEDS_DATA",
  "AMBIGUOUS",
  "UNSUPPORTED",
] as const;

export type NeedsAttentionAiStatus = (typeof NEEDS_ATTENTION_AI_STATUSES)[number];

export const NEEDS_ATTENTION_TASK_TYPES = [
  "assign_playbook",
  "closed_missing_review",
  "incomplete_closed_aggregate",
  "apply_inbox",
  "evaluate_expired_plan",
  "plan_ready_enter",
  "plan_window_closing",
  "closed_missing_observation",
  "missing_attribution",
  "playbook_samples",
  "monthly_loss_limit",
  "monthly_loss_warning",
  "unknown",
] as const;

export type NeedsAttentionTaskType = (typeof NEEDS_ATTENTION_TASK_TYPES)[number];

export type NeedsAttentionPriority = "critical" | "high" | "normal" | "low";

export type NeedsAttentionEvidenceRow = {
  field: string;
  value: unknown;
  source: string;
  verified: boolean;
};

export type NeedsAttentionMissingRow = {
  field: string;
  reason: string;
  requiredFor: string;
};

export type NeedsAttentionAmbiguityRow = {
  field: string;
  alternatives: string[];
  clarificationNeeded: string;
};

export type NeedsAttentionLinkedEntities = {
  ticker?: string;
  stockFileId?: string;
  planId?: string;
  tradeId?: string;
  playbookId?: string;
  observationId?: string;
  learningOutcomeId?: string;
  mafExperimentId?: string;
  inboxProposalIds?: string[];
};

export type NeedsAttentionGlobalContextSummary = {
  monthlyBudget?: number;
  carryoverAvailable?: number;
  spentThisMonth?: number;
  currentMonthPL?: number;
  openAttentionCount?: number;
  currentPortfolioRisk?: number;
  dashboardSnapshotLabel: "Dashboard snapshot";
};

export type NeedsAttentionSnapshot = {
  snapshotType: "matrix-needs-attention";
  snapshotVersion: number;
  task: {
    id: string;
    type: NeedsAttentionTaskType;
    title: string;
    reason: string;
    priority?: NeedsAttentionPriority;
    sourceCondition: string;
  };
  linkedEntities: NeedsAttentionLinkedEntities;
  globalContextSummary?: NeedsAttentionGlobalContextSummary;
  currentState: Record<string, unknown>;
  evidence: {
    available: NeedsAttentionEvidenceRow[];
    missing: NeedsAttentionMissingRow[];
    ambiguities: NeedsAttentionAmbiguityRow[];
  };
  aiContract: {
    firstResponseRequired: true;
    allowedStatuses: NeedsAttentionAiStatus[];
    allowedApplyBlockTypes: string[];
    forbiddenAssumptions: string[];
    completionCondition: string;
    snapshotSupport: "SUPPORTED" | "UNSUPPORTED" | "SUMMARY";
    availableVisibleBlocks: {
      dashboardSnapshot: "Dashboard snapshot";
      mechanics: "Matrix Mechanics";
      libraryIndex: "Library Index";
    };
  };
  instructions: string[];
};
