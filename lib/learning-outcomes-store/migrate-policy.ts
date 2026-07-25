/**
 * Migration identity + conflict policy for JSON → Supabase Learning Outcomes.
 */
import type { LearningOutcome } from "../learning-outcome-types";
import {
  checkLearningOutcomeIdentity,
  compareLearningOutcomeFreshness,
  mergeCanonicalLearningOutcome,
  mergeEqualTimestampLinks,
  resolveExistingLearningOutcome,
  validateLearningOutcomeTimestamps,
} from "./merge";

export type MigrateMatchType =
  | "id"
  | "trade_id"
  | "plan_id"
  | "none"
  | "collision";

export type MigrateAction =
  | "skip_remote_newer"
  | "skip_equal"
  | "update_canonical_remote"
  | "insert_new"
  | "invalid";

export type RemoteCanonicalMatch = {
  matchType: MigrateMatchType;
  row?: LearningOutcome;
  existingById?: LearningOutcome;
  existingByIdentity?: LearningOutcome;
  detail?: string;
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

function invalidDecision(detail: string, identityConflict = false): MigrationDecision {
  return {
    action: "invalid",
    identityConflict,
    conflicts: identityConflict,
    inserted: false,
    updated: false,
    skipped: false,
    detail,
  };
}

function findByBusinessIdentity(
  remoteRows: LearningOutcome[],
  row: LearningOutcome
): { matchType: "trade_id" | "plan_id"; row: LearningOutcome } | undefined {
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
  return undefined;
}

/**
 * Independent lookup: exact id AND plan/trade identity.
 * If they point at different rows → collision (invalid).
 */
export function matchRemoteCanonical(
  row: LearningOutcome,
  remoteRows: LearningOutcome[]
): RemoteCanonicalMatch {
  const existingById = remoteRows.find(
    (r) => r.id.toUpperCase() === row.id.toUpperCase()
  );
  const identityHit = findByBusinessIdentity(remoteRows, row);
  const existingByIdentity = identityHit?.row;

  try {
    const resolved = resolveExistingLearningOutcome({
      incoming: row,
      existingById,
      existingByIdentity,
    });

    if (resolved.resolution === "insert") {
      return { matchType: "none" };
    }
    if (resolved.resolution === "same_row") {
      return {
        matchType: "id",
        row: resolved.existing,
        existingById,
        existingByIdentity,
      };
    }
    // canonical_identity — different unused id, same plan/trade
    return {
      matchType: identityHit!.matchType,
      row: resolved.existing,
      existingById,
      existingByIdentity,
    };
  } catch (err) {
    const detail =
      err instanceof Error ? err.message : "canonical_identity_collision";
    return {
      matchType: "collision",
      existingById,
      existingByIdentity,
      detail,
    };
  }
}

export function decideMigrationAction(input: {
  local: LearningOutcome;
  remote?: LearningOutcome;
  matchType: MigrateMatchType;
  existingById?: LearningOutcome;
  existingByIdentity?: LearningOutcome;
  detail?: string;
}): MigrationDecision {
  const localTs = validateLearningOutcomeTimestamps(input.local);
  if (!localTs.valid) {
    return invalidDecision(
      `timestamp_invalid: ${localTs.errors.join("; ")}`
    );
  }

  if (input.matchType === "collision") {
    return invalidDecision(
      input.detail ?? "canonical_identity_collision",
      true
    );
  }

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

  const remoteTs = validateLearningOutcomeTimestamps(remote);
  if (!remoteTs.valid) {
    return invalidDecision(
      `existing_timestamp_invalid: ${remoteTs.errors.join("; ")}. Explicit repair required.`,
      identityConflict
    );
  }

  const identity = checkLearningOutcomeIdentity(remote, local);
  if (!identity.ok) {
    return invalidDecision(identity.message, true);
  }

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
