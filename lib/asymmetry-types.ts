/** Confirmation economics — prices must be supplied, never invented. */
export interface ConfirmationCost {
  currentRR?: number;
  estimatedConfirmedRR?: number;
  rewardConsumedPercent?: number;
  assessment?: string;
}

export function parseConfirmationCost(raw: unknown): ConfirmationCost | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const result: ConfirmationCost = {};
  if (obj.currentRR !== undefined) result.currentRR = Number(obj.currentRR);
  if (obj.estimatedConfirmedRR !== undefined) {
    result.estimatedConfirmedRR = Number(obj.estimatedConfirmedRR);
  }
  if (obj.rewardConsumedPercent !== undefined) {
    result.rewardConsumedPercent = Number(obj.rewardConsumedPercent);
  }
  if (obj.assessment) result.assessment = String(obj.assessment).trim();
  return Object.keys(result).length > 0 ? result : undefined;
}

/** Classify loss after post-stop study — not at stop time. */
export type LossClassification =
  | "thesis_failure"
  | "entry_too_early"
  | "entry_too_late"
  | "stop_too_tight"
  | "normal_valid_loss"
  | "confirmation_consumed_rr"
  | "support_failed"
  | "execution_error"
  | "pending_study";

export const LOSS_CLASSIFICATIONS: LossClassification[] = [
  "thesis_failure",
  "entry_too_early",
  "entry_too_late",
  "stop_too_tight",
  "normal_valid_loss",
  "confirmation_consumed_rr",
  "support_failed",
  "execution_error",
  "pending_study",
];

export const LOSS_CLASSIFICATION_LABELS: Record<LossClassification, string> = {
  thesis_failure: "Thesis failure",
  entry_too_early: "Entry too early",
  entry_too_late: "Entry too late (confirmation consumed R:R)",
  stop_too_tight: "Stop too tight / swept",
  normal_valid_loss: "Normal valid loss",
  confirmation_consumed_rr: "Confirmation consumed R:R",
  support_failed: "Support failed",
  execution_error: "Execution error",
  pending_study: "Pending 90-day study",
};

export const POST_STOP_STUDY_DAYS = 90;

/** Shadow follow-up after a stopped/losing trade — hypothesis vs trade outcome. */
export interface PostStopStudy {
  enabled: boolean;
  durationDays: number;
  startedAt: string;
  endsAt: string;
  originalTradeId: string;
  originalEntry: number;
  originalStop?: number;
  originalTargets?: number[];
  originalThesisInvalidation?: string;
  maxPriceAfterStop?: number;
  minPriceAfterStop?: number;
  targetReached?: boolean;
  thesisInvalidated?: boolean;
  classifiedAt?: string;
  notes?: string;
}
