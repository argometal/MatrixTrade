/**
 * Migration identity + conflict policy for JSON → Supabase Learning Outcomes.
 */
import type { LearningOutcome } from "../learning-outcome-types";
import {
  compareLearningOutcomeFreshness,
  mergeCanonicalLearningOutcome,
  mergeEqualTimestampLinks,
} from "./merge";

export type MigrateMatchType = "id" | "trade_id" | "plan_id" | "none";

export type MigrateAction =
  | "skip_remote_newer"
  | "skip_equal"
  | "update_canonical_remote"
  | "insert_new"
  | "invalid";

export type RemoteCanonicalMatch = {
  matchType: MigrateMatchType;
  row?: LearningOutcome;
};

export type MigrationDecision = {
  action: MigrateAction;
  identityConflict: boolean;
  /** Count toward conflicts when ids differ on plan/trade identity. */
  conflicts: boolean;
  inserted: boolean;
  updated: boolean;
  skipped: boolean;
  merged?: LearningOutcome;
  detail?: string;
};

function linksChanged(a: LearningOutcome, b: LearningOutcome): boolean {
  return (
    a.observationId !== b.observationId ||
    a.mafExperimentId !== b.mafExperimentId ||
    a.stockThesisId !== b.stockThesisId ||
    a.playbookId !== b.playbookId
  );
}

/**
 * Lookup order against an in-memory remote set (same as Supabase migration):
 * 1. exact id
 * 2. trade_id when row.tradeId exists
 * 3. plan_id + trade_id null when Scout-only
 */
export function matchRemoteCanonical(
  row: LearningOutcome,
  remoteRows: LearningOutcome[]
): RemoteCanonicalMatch {
  const byId = remoteRows.find(
    (r) => r.id.toUpperCase() === row.id.toUpperCase()
  );
  if (byId) return { matchType: "id", row: byId };

  if (row.tradeId) {
    const byTrade = remoteRows.find(
      (r) => r.tradeId?.toUpperCase() === row.tradeId!.toUpperCase()
    );
    if (byTrade) return { matchType: "trade_id", row: byTrade };
  }

  if (row.planId && !row.tradeId) {
    const byPlan = remoteRows.find(
      (r) =>
        !r.tradeId &&
        r.planId?.toUpperCase() === row.planId!.toUpperCase()
    );
    if (byPlan) return { matchType: "plan_id", row: byPlan };
  }

  return { matchType: "none" };
}

export function decideMigrationAction(input: {
  local: LearningOutcome;
  remote?: LearningOutcome;
  matchType: MigrateMatchType;
}): MigrationDecision {
  if (!input.remote || input.matchType === "none") {
    return {
      action: "insert_new",
      identityConflict: false,
      conflicts: false,
      inserted: true,
      updated: false,
      skipped: false,
      merged: input.local,
      detail: "No remote identity match — insert new row",
    };
  }

  const remote = input.remote;
  const local = input.local;
  const identityConflict =
    remote.id.toUpperCase() !== local.id.toUpperCase();

  const freshness = compareLearningOutcomeFreshness(remote, local);

  if (freshness === "existing_newer") {
    return {
      action: "skip_remote_newer",
      identityConflict,
      conflicts: identityConflict,
      inserted: false,
      updated: false,
      skipped: true,
      merged: remote,
      detail: "Remote updatedAt is newer — skip overwrite",
    };
  }

  if (freshness === "equal") {
    const merged = mergeEqualTimestampLinks(remote, local);
    if (!linksChanged(remote, merged)) {
      return {
        action: "skip_equal",
        identityConflict,
        conflicts: identityConflict,
        inserted: false,
        updated: false,
        skipped: true,
        merged: remote,
        detail: "Equal timestamps — idempotent skip",
      };
    }
    return {
      action: "update_canonical_remote",
      identityConflict,
      conflicts: identityConflict,
      inserted: false,
      updated: true,
      skipped: false,
      merged,
      detail: "Equal timestamps — fill missing protected links only",
    };
  }

  // Local newer (or unparseable → allow merge onto canonical).
  const merged = mergeCanonicalLearningOutcome(remote, local);
  return {
    action: "update_canonical_remote",
    identityConflict,
    conflicts: identityConflict,
    inserted: false,
    updated: true,
    skipped: false,
    merged,
    detail: identityConflict
      ? "Identity conflict — update canonical remote id"
      : "Local newer — update remote by id",
  };
}
