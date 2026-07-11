import { calculateTradeResult } from "./calculate";
import {
  LOSS_CLASSIFICATION_LABELS,
  POST_STOP_STUDY_DAYS,
  type LossClassification,
  type PostStopStudy,
} from "./asymmetry-types";
import type { Trade } from "./types";

export { POST_STOP_STUDY_DAYS, LOSS_CLASSIFICATION_LABELS };

export function isPostStopStudyActive(study: PostStopStudy, now = Date.now()): boolean {
  if (!study.enabled) return false;
  const ends = Date.parse(study.endsAt);
  return Number.isFinite(ends) && ends > now;
}

/** Start shadow observation when a trade closes at a loss. */
export function createPostStopStudyFromTrade(
  trade: Trade,
  options?: { thesisInvalidation?: string }
): PostStopStudy | undefined {
  if (trade.status !== "closed" || !trade.closedAt) return undefined;
  const result = calculateTradeResult(trade);
  if (result === null || result >= 0) return undefined;

  const startedAt = trade.closedAt;
  const endsAt = new Date(
    Date.parse(startedAt) + POST_STOP_STUDY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  return {
    enabled: true,
    durationDays: POST_STOP_STUDY_DAYS,
    startedAt,
    endsAt,
    originalTradeId: trade.id,
    originalEntry: trade.entry,
    originalStop: trade.stop,
    originalTargets: trade.target !== undefined ? [trade.target] : undefined,
    originalThesisInvalidation: options?.thesisInvalidation,
  };
}

export function defaultLossClassificationForStudy(
  study?: PostStopStudy
): LossClassification {
  if (study?.enabled && isPostStopStudyActive(study)) return "pending_study";
  return "pending_study";
}

export function formatPostStopStudySection(study: PostStopStudy): string {
  const lines = [
    "=== POST-STOP STUDY (90d) ===",
    `trade:${study.originalTradeId}`,
    `started:${study.startedAt}`,
    `ends:${study.endsAt}`,
    `entry:${study.originalEntry}`,
    `stop:${study.originalStop ?? "na"}`,
    `targets:${study.originalTargets?.join(",") ?? "na"}`,
    `active:${isPostStopStudyActive(study) ? "yes" : "no"}`,
  ];
  if (study.originalThesisInvalidation) {
    lines.push(
      `thesis_invalidation:${study.originalThesisInvalidation.replace(/\s+/g, " ").slice(0, 120)}`
    );
  }
  if (study.targetReached !== undefined) {
    lines.push(`target_reached:${study.targetReached ? "yes" : "no"}`);
  }
  if (study.thesisInvalidated !== undefined) {
    lines.push(`thesis_invalidated:${study.thesisInvalidated ? "yes" : "no"}`);
  }
  if (study.notes) lines.push(`notes:${study.notes.replace(/\s+/g, " ").slice(0, 200)}`);
  return lines.join("\n");
}
