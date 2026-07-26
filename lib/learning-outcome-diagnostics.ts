/**
 * Read-only Learning Outcome / Plan Outcome durability diagnostics.
 * Does not mutate. Repair plan outcomes via Retry Learning Sync only.
 */
import type { LearningOutcome } from "./learning-outcome-types";
import type { TradePlan } from "./plan-types";
import type { ObservationRecord } from "./observation-types";
import type { Trade } from "./types";
import {
  compareLearningOutcomeFreshness,
  validateLearningOutcomeTimestamps,
} from "./learning-outcomes-store/merge";

export type LearningOutcomeDiagnosticIssue = {
  code: string;
  message: string;
  planId?: string;
  tradeId?: string;
  learningOutcomeId?: string;
  observationId?: string;
  localId?: string;
  remoteId?: string;
};

function isUplPlan(plan: TradePlan): boolean {
  const o = plan.outcome;
  if (!o) return false;
  if (o.outcomeKind === "unexecuted_plan_loss") return true;
  return o.status === "theoretical_loss" && o.tradeExecuted === false;
}

export function diagnoseLearningOutcomeDurability(input: {
  plans: TradePlan[];
  trades: Trade[];
  learningOutcomes: LearningOutcome[];
  observations: ObservationRecord[];
  /** Optional local/JSON rows to compare against durable/canonical set. */
  localLearningOutcomes?: LearningOutcome[];
}): LearningOutcomeDiagnosticIssue[] {
  const issues: LearningOutcomeDiagnosticIssue[] = [];
  const loById = new Map(
    input.learningOutcomes.map((lo) => [lo.id.toUpperCase(), lo])
  );
  const planById = new Map(
    input.plans.map((p) => [p.id.toUpperCase(), p])
  );
  const tradeById = new Map(
    input.trades.map((t) => [t.id.toUpperCase(), t])
  );
  const obsById = new Map(
    input.observations.map((o) => [o.id.toUpperCase(), o])
  );
  const obsByPlan = new Map<string, ObservationRecord>();
  const obsByLo = new Map<string, ObservationRecord>();
  for (const obs of input.observations) {
    if (obs.planId && !obs.tradeId) {
      obsByPlan.set(obs.planId.toUpperCase(), obs);
    }
    if (obs.learningOutcomeId) {
      obsByLo.set(obs.learningOutcomeId.toUpperCase(), obs);
    }
  }

  const byPlan = new Map<string, LearningOutcome[]>();
  const byTrade = new Map<string, LearningOutcome[]>();
  for (const lo of input.learningOutcomes) {
    if (lo.planId && !lo.tradeId) {
      const k = lo.planId.toUpperCase();
      const list = byPlan.get(k) ?? [];
      list.push(lo);
      byPlan.set(k, list);
    }
    if (lo.tradeId) {
      const k = lo.tradeId.toUpperCase();
      const list = byTrade.get(k) ?? [];
      list.push(lo);
      byTrade.set(k, list);
    }
  }

  for (const [planId, list] of byPlan) {
    if (list.length > 1) {
      issues.push({
        code: "duplicate_lo_plan",
        message: `Duplicate Scout LO rows for planId ${planId}: ${list.map((l) => l.id).join(", ")}`,
        planId,
      });
    }
  }
  for (const [tradeId, list] of byTrade) {
    if (list.length > 1) {
      issues.push({
        code: "duplicate_lo_trade",
        message: `Duplicate Trade LO rows for tradeId ${tradeId}: ${list.map((l) => l.id).join(", ")}`,
        tradeId,
      });
    }
  }

  for (const plan of input.plans) {
    if (!plan.outcome?.recordedAt) continue;
    const loList = byPlan.get(plan.id.toUpperCase()) ?? [];
    const lo = loList[0];
    if (!lo) {
      issues.push({
        code: "plan_outcome_missing_lo",
        message: `Plan ${plan.id} has outcome.recordedAt but no Scout Learning Outcome`,
        planId: plan.id,
      });
    }
    if (plan.outcome.learningSyncStatus === "complete" && !lo) {
      issues.push({
        code: "sync_complete_missing_lo",
        message: `Plan ${plan.id} learningSyncStatus=complete but durable LO missing`,
        planId: plan.id,
      });
    }
    if (
      plan.outcome.learningOutcomeId &&
      !loById.has(plan.outcome.learningOutcomeId.toUpperCase())
    ) {
      issues.push({
        code: "stale_learning_outcome_id",
        message: `Plan ${plan.id} learningOutcomeId ${plan.outcome.learningOutcomeId} does not exist`,
        planId: plan.id,
        learningOutcomeId: plan.outcome.learningOutcomeId,
      });
    }
    if (
      lo &&
      plan.outcome.learningOutcomeId &&
      plan.outcome.learningOutcomeId.toUpperCase() !== lo.id.toUpperCase()
    ) {
      issues.push({
        code: "plan_outcome_lo_id_mismatch",
        message: `Plan ${plan.id} learningOutcomeId ${plan.outcome.learningOutcomeId} differs from canonical LO ${lo.id}`,
        planId: plan.id,
        learningOutcomeId: lo.id,
        localId: plan.outcome.learningOutcomeId,
        remoteId: lo.id,
      });
    }
    if (isUplPlan(plan) || lo?.kind === "unexecuted_plan_loss") {
      const obs = obsByPlan.get(plan.id.toUpperCase());
      if (lo && !obs) {
        issues.push({
          code: "missing_obs_link",
          message: `UPL LO ${lo.id} missing Observation for plan ${plan.id}`,
          planId: plan.id,
          learningOutcomeId: lo.id,
        });
      }
    }
  }

  for (const lo of input.learningOutcomes) {
    const ts = validateLearningOutcomeTimestamps(lo);
    if (!ts.valid) {
      issues.push({
        code: "lo_invalid_timestamps",
        message: `LO ${lo.id} has invalid timestamps (${ts.errors.join("; ")}). Explicit repair required — do not overwrite automatically.`,
        learningOutcomeId: lo.id,
        planId: lo.planId,
        tradeId: lo.tradeId,
      });
    }
    if (lo.planId && !planById.has(lo.planId.toUpperCase())) {
      issues.push({
        code: "lo_orphaned_plan",
        message: `LO ${lo.id} planId ${lo.planId} points to no plan`,
        learningOutcomeId: lo.id,
        planId: lo.planId,
      });
    }
    if (lo.tradeId && !tradeById.has(lo.tradeId.toUpperCase())) {
      issues.push({
        code: "lo_orphaned_trade",
        message: `LO ${lo.id} tradeId ${lo.tradeId} points to no trade`,
        learningOutcomeId: lo.id,
        tradeId: lo.tradeId,
      });
    }
    if (lo.observationId && !obsById.has(lo.observationId.toUpperCase())) {
      issues.push({
        code: "lo_stale_observation_id",
        message: `LO ${lo.id} observationId ${lo.observationId} points to no Observation`,
        learningOutcomeId: lo.id,
        observationId: lo.observationId,
      });
    }
    const obsLinked = obsByLo.get(lo.id.toUpperCase());
    if (
      obsLinked &&
      lo.observationId &&
      obsLinked.id.toUpperCase() !== lo.observationId.toUpperCase()
    ) {
      issues.push({
        code: "obs_lo_bidirectional_mismatch",
        message: `Observation ${obsLinked.id} links LO ${lo.id} but LO.observationId is ${lo.observationId}`,
        learningOutcomeId: lo.id,
        observationId: obsLinked.id,
      });
    }
  }

  if (input.localLearningOutcomes?.length) {
    for (const local of input.localLearningOutcomes) {
      let remote: LearningOutcome | undefined;
      if (local.tradeId) {
        remote = byTrade.get(local.tradeId.toUpperCase())?.[0];
      } else if (local.planId) {
        remote = byPlan.get(local.planId.toUpperCase())?.[0];
      } else {
        remote = loById.get(local.id.toUpperCase());
      }
      if (!remote) continue;
      if (remote.id.toUpperCase() !== local.id.toUpperCase()) {
        issues.push({
          code: "local_remote_identity_conflict",
          message: `Local LO ${local.id} shares identity with remote LO ${remote.id}`,
          localId: local.id,
          remoteId: remote.id,
          planId: local.planId ?? remote.planId,
          tradeId: local.tradeId ?? remote.tradeId,
        });
      }
      const localTs = validateLearningOutcomeTimestamps(local);
      const remoteTs = validateLearningOutcomeTimestamps(remote);
      if (!localTs.valid || !remoteTs.valid) {
        issues.push({
          code: "stale_or_invalid_timestamp_compare",
          message: `Cannot compare local LO ${local.id} with canonical ${remote.id}: invalid timestamps (local: ${localTs.errors.join("; ") || "ok"}; remote: ${remoteTs.errors.join("; ") || "ok"}). Explicit repair required.`,
          localId: local.id,
          remoteId: remote.id,
        });
        continue;
      }
      const freshness = compareLearningOutcomeFreshness(remote, local);
      if (freshness === "existing_newer") {
        issues.push({
          code: "stale_local_json_row",
          message: `Local LO ${local.id} is older than canonical ${remote.id}`,
          localId: local.id,
          remoteId: remote.id,
        });
      }
    }
  }

  return issues;
}

/** Detect MAF link regression between two LO snapshots (same id). */
export function diagnoseMafLinkRegression(
  before: LearningOutcome,
  after: LearningOutcome
): LearningOutcomeDiagnosticIssue | null {
  if (
    before.mafExperimentId &&
    before.mafExperimentId !== after.mafExperimentId
  ) {
    return {
      code: "maf_link_lost",
      message: `LO ${before.id} lost mafExperimentId ${before.mafExperimentId} after sync (now ${after.mafExperimentId ?? "none"})`,
      learningOutcomeId: before.id,
    };
  }
  return null;
}
