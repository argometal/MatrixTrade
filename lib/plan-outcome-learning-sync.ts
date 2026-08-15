/**
 * Durable, idempotent Plan Outcome → Learning Outcome → Observation sync.
 * CURSOR plan-outcome learning reliability — no silent failures.
 */
import type { TradePlan } from "./plan-types";
import type { LearningSyncStatus } from "./plan-outcome-types";
import {
  PLAN_COUNTERFACTUAL_OBSERVATION_KIND,
  TRIGGERED_UNEXECUTED_PLAN_UNIT,
} from "./plan-outcome-types";
import { getPlanById } from "./plans";
import { getPlansStore } from "./plans-store";
import {
  upsertLearningOutcomeFromPlan,
  linkObservationToLearningOutcome,
} from "./learning-outcome";
import {
  getLearningOutcomeByPlanId,
  upsertLearningOutcome,
} from "./learning-outcome-store";
import type { LearningOutcome } from "./learning-outcome-types";
import {
  getObservationByPlanId,
  getObservations,
  nextObservationId,
  upsertObservation,
} from "./observation-store";
import type { ObservationRecord } from "./observation-types";

export type PlanOutcomeLearningVerifyIssue = {
  code: string;
  message: string;
};

export type PlanOutcomeLearningVerifyResult = {
  ok: boolean;
  issues: PlanOutcomeLearningVerifyIssue[];
  learningOutcome?: LearningOutcome;
  observation?: ObservationRecord;
  /** Effective sync status (persisted or derived for legacy). */
  effectiveStatus: LearningSyncStatus;
};

export type SyncPlanOutcomeLearningResult = {
  ok: boolean;
  plan?: TradePlan;
  learningOutcome?: LearningOutcome;
  observation?: ObservationRecord;
  errors?: string[];
};

/** Test-only failure injection — never set in production. */
let __failLoWrite: Error | null = null;
let __failObsWrite: Error | null = null;

export function __setPlanOutcomeSyncTestHooks(hooks: {
  failLoWrite?: Error | null;
  failObsWrite?: Error | null;
} | null): void {
  __failLoWrite = hooks?.failLoWrite ?? null;
  __failObsWrite = hooks?.failObsWrite ?? null;
}

/** Sanitize error for persistence — no stacks, secrets, or env dumps. */
export function sanitizeLearningSyncError(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Learning synchronization failed";
  let msg = raw.replace(/\s+/g, " ").trim().slice(0, 240);
  msg = msg.replace(
    /(supabase|service[_-]?role|api[_-]?key|password|secret|token|bearer)\s*[:=]\s*\S+/gi,
    "$1=[redacted]"
  );
  msg = msg.replace(/-----BEGIN[\s\S]*?-----END[^-]+-----/gi, "[redacted-pem]");
  return msg || "Learning synchronization failed";
}

function isUnexecutedPlanLoss(plan: TradePlan): boolean {
  const o = plan.outcome;
  if (!o) return false;
  if (o.outcomeKind === "unexecuted_plan_loss") return true;
  return o.status === "theoretical_loss" && o.tradeExecuted === false;
}

function isMissedOpportunity(plan: TradePlan): boolean {
  return plan.outcome?.outcomeKind === "missed_opportunity";
}

function isDuplicateCreation(plan: TradePlan): boolean {
  return plan.outcome?.outcomeKind === "duplicate_creation";
}

function observationRequired(plan: TradePlan): boolean {
  if (isDuplicateCreation(plan)) return false;
  if (isUnexecutedPlanLoss(plan)) return true;
  if (isMissedOpportunity(plan)) return true;
  // Other counterfactual / no-trade outcomes that seed OBS today.
  return plan.outcome?.tradeExecuted === false && !plan.linkedTradeId;
}

/** Verify LO/OBS links for a persisted plan outcome (does not mutate). */
export function verifyPlanOutcomeLearningLinks(
  plan: TradePlan,
  learningOutcome: LearningOutcome | undefined,
  observation: ObservationRecord | undefined
): PlanOutcomeLearningVerifyResult {
  const issues: PlanOutcomeLearningVerifyIssue[] = [];
  const o = plan.outcome;
  if (!o?.recordedAt) {
    return {
      ok: false,
      issues: [{ code: "no_outcome", message: "plan.outcome.recordedAt missing" }],
      effectiveStatus: "pending",
    };
  }

  if (isDuplicateCreation(plan)) {
    if (!learningOutcome) {
      issues.push({ code: "missing_lo", message: "Learning Outcome missing for duplicate_creation" });
    } else {
      if (learningOutcome.kind !== "duplicate_creation") {
        issues.push({
          code: "wrong_lo_kind",
          message: `Expected LO kind duplicate_creation, got ${learningOutcome.kind}`,
        });
      }
      if (learningOutcome.excludedFromMetrics !== true) {
        issues.push({
          code: "not_excluded",
          message: "duplicate_creation LO must have excludedFromMetrics=true",
        });
      }
    }
  } else if (isUnexecutedPlanLoss(plan)) {
    if (!learningOutcome) {
      issues.push({
        code: "missing_lo",
        message: "Learning Outcome missing for unexecuted_plan_loss",
      });
    } else {
      if (learningOutcome.kind !== "unexecuted_plan_loss") {
        issues.push({
          code: "wrong_lo_kind",
          message: `Expected LO kind unexecuted_plan_loss, got ${learningOutcome.kind}`,
        });
      }
      if (learningOutcome.tradeId) {
        issues.push({
          code: "lo_has_trade",
          message: "unexecuted_plan_loss LO must not have tradeId",
        });
      }
      if (learningOutcome.realizedR !== 0) {
        issues.push({
          code: "realized_r",
          message: `Expected realizedR=0, got ${String(learningOutcome.realizedR)}`,
        });
      }
      if (learningOutcome.counterfactualR !== -1) {
        issues.push({
          code: "counterfactual_r",
          message: `Expected counterfactualR=-1, got ${String(learningOutcome.counterfactualR)}`,
        });
      }
      if (learningOutcome.lifecycleStatus !== "concluded") {
        issues.push({
          code: "lifecycle",
          message: `Expected LO lifecycle concluded, got ${learningOutcome.lifecycleStatus}`,
        });
      }
    }

    if (!observation) {
      issues.push({
        code: "missing_obs",
        message: "Counterfactual Observation missing for unexecuted_plan_loss",
      });
    } else if (learningOutcome) {
      if (observation.learningOutcomeId !== learningOutcome.id) {
        issues.push({
          code: "obs_lo_link",
          message: "Observation.learningOutcomeId does not match LO",
        });
      }
      if (learningOutcome.observationId !== observation.id) {
        issues.push({
          code: "lo_obs_link",
          message: "LO.observationId does not match Observation",
        });
      }
    }
  } else if (isMissedOpportunity(plan)) {
    if (!learningOutcome) {
      issues.push({
        code: "missing_lo",
        message: "Learning Outcome missing for missed_opportunity",
      });
    } else {
      if (learningOutcome.kind !== "missed_opportunity") {
        issues.push({
          code: "wrong_lo_kind",
          message: `Expected LO kind missed_opportunity, got ${learningOutcome.kind}`,
        });
      }
      if (learningOutcome.tradeId) {
        issues.push({
          code: "lo_has_trade",
          message: "missed_opportunity LO must not have tradeId",
        });
      }
      if (learningOutcome.realizedR !== 0) {
        issues.push({
          code: "realized_r",
          message: `Expected realizedR=0, got ${String(learningOutcome.realizedR)}`,
        });
      }
      if (
        learningOutcome.counterfactualR === undefined ||
        learningOutcome.counterfactualR === null ||
        !(learningOutcome.counterfactualR > 0)
      ) {
        issues.push({
          code: "counterfactual_r",
          message: `Expected counterfactualR=+planned R (>0), got ${String(learningOutcome.counterfactualR)}`,
        });
      }
      if (learningOutcome.entryReached !== false) {
        issues.push({
          code: "entry_reached",
          message: "missed_opportunity requires entryReached=false",
        });
      }
      if (learningOutcome.targetReachedBeforeStop !== true) {
        issues.push({
          code: "target_before_stop",
          message: "missed_opportunity requires targetReachedBeforeStop=true",
        });
      }
      if (learningOutcome.stopReachedBeforeTarget !== false) {
        issues.push({
          code: "stop_before_target",
          message: "missed_opportunity requires stopReachedBeforeTarget=false",
        });
      }
      if (learningOutcome.nonExecutionReason !== "entry_not_reached") {
        issues.push({
          code: "non_execution_reason",
          message: "missed_opportunity requires nonExecutionReason=entry_not_reached",
        });
      }
    }

    if (!observation) {
      issues.push({
        code: "missing_obs",
        message: "Counterfactual Observation missing for missed_opportunity",
      });
    } else if (learningOutcome) {
      if (observation.learningOutcomeId !== learningOutcome.id) {
        issues.push({
          code: "obs_lo_link",
          message: "Observation.learningOutcomeId does not match LO",
        });
      }
      if (learningOutcome.observationId !== observation.id) {
        issues.push({
          code: "lo_obs_link",
          message: "LO.observationId does not match Observation",
        });
      }
      if (observation.entryTriggered === true) {
        issues.push({
          code: "obs_entry",
          message: "missed_opportunity Observation must not set entryTriggered=true",
        });
      }
      if (observation.learningUnitKind === TRIGGERED_UNEXECUTED_PLAN_UNIT) {
        issues.push({
          code: "obs_unit",
          message: "missed_opportunity must not use triggered_unexecuted_plan unit",
        });
      }
    }
  } else if (observationRequired(plan)) {
    if (!learningOutcome) {
      issues.push({ code: "missing_lo", message: "Learning Outcome missing" });
    }
    if (!observation) {
      issues.push({ code: "missing_obs", message: "Observation missing" });
    }
  } else if (!learningOutcome) {
    // Terminal outcome that should still have an LO when kind is derivable.
    issues.push({ code: "missing_lo", message: "Learning Outcome missing" });
  }

  const ok = issues.length === 0;
  let effectiveStatus: LearningSyncStatus;
  if (o.learningSyncStatus === "complete" && ok) {
    effectiveStatus = "complete";
  } else if (o.learningSyncStatus === "failed") {
    effectiveStatus = ok ? "complete" : "failed";
  } else if (o.learningSyncStatus === "pending") {
    effectiveStatus = ok ? "complete" : "pending";
  } else {
    // Legacy: derive at read time without rewriting.
    effectiveStatus = ok ? "complete" : "pending";
  }

  return { ok, issues, learningOutcome, observation, effectiveStatus };
}

export async function loadAndVerifyPlanOutcomeLearning(
  plan: TradePlan
): Promise<PlanOutcomeLearningVerifyResult> {
  const lo = await getLearningOutcomeByPlanId(plan.id);
  const obs = await getObservationByPlanId(plan.id);
  return verifyPlanOutcomeLearningLinks(plan, lo, obs);
}

async function patchOutcomeSyncFields(
  plan: TradePlan,
  patch: Partial<NonNullable<TradePlan["outcome"]>>
): Promise<TradePlan> {
  const now = new Date().toISOString();
  const updated: TradePlan = {
    ...plan,
    outcome: {
      ...plan.outcome!,
      ...patch,
      updatedAt: now,
    },
    updatedAt: now,
  };
  await getPlansStore().upsert(updated);
  return updated;
}

async function ensureCounterfactualObservationForSync(
  plan: TradePlan,
  learningOutcomeId: string
): Promise<ObservationRecord> {
  if (__failObsWrite) throw __failObsWrite;

  const o = plan.outcome!;
  const existing = await getObservationByPlanId(plan.id);
  const now = new Date().toISOString();
  const entryTriggered = o.entryTriggered ?? o.entryReached ?? null;
  const stopTriggered = o.stopTriggered ?? o.stopReachedBeforeTarget ?? null;
  const targetTriggered = o.targetTriggered ?? o.targetReachedBeforeStop ?? null;

  if (existing) {
    const patched: ObservationRecord = {
      ...existing,
      learningOutcomeId,
      observationKind: PLAN_COUNTERFACTUAL_OBSERVATION_KIND,
      learningUnitKind:
        entryTriggered === true && o.tradeExecuted === false
          ? TRIGGERED_UNEXECUTED_PLAN_UNIT
          : existing.learningUnitKind,
      entryTriggered: entryTriggered ?? existing.entryTriggered,
      stopTriggered: stopTriggered ?? existing.stopTriggered,
      targetTriggered: targetTriggered ?? existing.targetTriggered,
      theoreticalResultR: o.theoreticalResultR ?? existing.theoreticalResultR,
      realizedResultR: 0,
      evidenceRefs: o.evidenceRefs?.length ? o.evidenceRefs : existing.evidenceRefs,
      conclusionReason: o.notes ?? existing.conclusionReason,
      concludedAt: existing.concludedAt ?? now,
      status: existing.status === "observing" ? "concluded" : existing.status,
      firstTerminalEvent:
        targetTriggered === true
          ? "target"
          : stopTriggered === true
            ? "invalidation"
            : existing.firstTerminalEvent,
      lastUpdatedAt: now,
      notes: o.notes ?? existing.notes,
    };
    await upsertObservation(patched);
    return patched;
  }

  const all = await getObservations();
  const startedAt = o.recordedAt ?? plan.updatedAt ?? now;
  const durationDays = 90;
  const endsAt = new Date(
    Date.parse(startedAt) + durationDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const row: ObservationRecord = {
    id: nextObservationId(all, plan.ticker),
    learningOutcomeId,
    planId: plan.id,
    ticker: plan.ticker.toUpperCase(),
    status: "concluded",
    startedAt,
    endsAt,
    durationDays,
    referenceEntry: plan.plannedEntry,
    referenceStop: plan.stopPrice,
    referenceTargets:
      plan.targetPrice !== undefined ? [plan.targetPrice] : undefined,
    observationKind: PLAN_COUNTERFACTUAL_OBSERVATION_KIND,
    learningUnitKind:
      entryTriggered === true && o.tradeExecuted === false
        ? TRIGGERED_UNEXECUTED_PLAN_UNIT
        : undefined,
    entryTriggered,
    stopTriggered,
    targetTriggered,
    theoreticalResultR: o.theoreticalResultR ?? null,
    realizedResultR: 0,
    evidenceRefs: o.evidenceRefs ?? [],
    conclusionReason: o.notes,
    concludedAt: now,
    thesisInvalidated: undefined,
    targetReached:
      targetTriggered === true ? true : targetTriggered === false ? false : undefined,
    firstTerminalEvent:
      targetTriggered === true
        ? "target"
        : stopTriggered === true
          ? "invalidation"
          : undefined,
    dataSource: "manual",
    notes: o.notes,
    createdAt: now,
    lastUpdatedAt: now,
  };
  await upsertObservation(row);
  return row;
}

/**
 * Idempotent synchronizer: Plan Outcome → LO → OBS → verify → learningSyncStatus=complete.
 * Safe to run repeatedly. Preserves accepted MAF links on the LO.
 */
export async function syncPlanOutcomeLearning(
  planId: string
): Promise<SyncPlanOutcomeLearningResult> {
  const needle = planId.trim().toUpperCase();
  let plan = await getPlanById(needle);
  if (!plan) return { ok: false, errors: [`Plan ${needle} not found.`] };
  if (!plan.outcome?.recordedAt) {
    return {
      ok: false,
      errors: [`Plan ${needle} has no outcome.recordedAt — record plan-outcome first.`],
    };
  }

  const attemptedAt = new Date().toISOString();
  plan = await patchOutcomeSyncFields(plan, {
    learningSyncStatus: plan.outcome.learningSyncStatus === "complete" ? "complete" : "pending",
    learningSyncAttemptedAt: attemptedAt,
    learningSyncError: undefined,
  });

  try {
    if (__failLoWrite) throw __failLoWrite;

    const priorLo = await getLearningOutcomeByPlanId(plan.id);
    const priorMafId = priorLo?.mafExperimentId;

    let learningOutcome = await upsertLearningOutcomeFromPlan(plan);
    if (!learningOutcome) {
      throw new Error(
        "Could not derive Learning Outcome for this plan outcome (no canonical kind)."
      );
    }

    // Preserve accepted MAF link across upserts.
    if (priorMafId && learningOutcome.mafExperimentId !== priorMafId) {
      learningOutcome = {
        ...learningOutcome,
        mafExperimentId: priorMafId,
        lifecycleStatus:
          learningOutcome.lifecycleStatus === "concluded"
            ? "concluded"
            : "attributed",
        updatedAt: new Date().toISOString(),
      };
      await upsertLearningOutcome(learningOutcome);
    }

    let observation: ObservationRecord | undefined;
    if (observationRequired(plan)) {
      observation = await ensureCounterfactualObservationForSync(
        plan,
        learningOutcome.id
      );
      await linkObservationToLearningOutcome(learningOutcome.id, observation.id);
      // Re-read / force concluded + observationId for UPL.
      learningOutcome = {
        ...learningOutcome,
        observationId: observation.id,
        lifecycleStatus:
          learningOutcome.kind === "unexecuted_plan_loss"
            ? "concluded"
            : learningOutcome.lifecycleStatus === "attributed"
              ? "attributed"
              : learningOutcome.lifecycleStatus,
        mafExperimentId: learningOutcome.mafExperimentId ?? priorMafId,
        updatedAt: new Date().toISOString(),
      };
      await upsertLearningOutcome(learningOutcome);
    }

    const verify = verifyPlanOutcomeLearningLinks(plan, learningOutcome, observation);
    if (!verify.ok) {
      throw new Error(
        verify.issues.map((i) => i.message).join("; ") || "Learning sync verification failed"
      );
    }

    plan = await patchOutcomeSyncFields(plan, {
      learningSyncStatus: "complete",
      learningSyncError: undefined,
      learningSyncAttemptedAt: attemptedAt,
      learningOutcomeId: learningOutcome.id,
      observationId: observation?.id,
    });

    return { ok: true, plan, learningOutcome, observation };
  } catch (err) {
    const message = sanitizeLearningSyncError(err);
    plan = await patchOutcomeSyncFields(plan, {
      learningSyncStatus: "failed",
      learningSyncError: message,
      learningSyncAttemptedAt: attemptedAt,
    });
    return { ok: false, plan, errors: [message] };
  }
}

export type PlanOutcomeLearningReconcileRow = {
  planId: string;
  ticker: string;
  effectiveStatus: LearningSyncStatus;
  issues: PlanOutcomeLearningVerifyIssue[];
  needsRepair: boolean;
};

/** Deterministic scan — no background automation. */
export function reconcilePlanOutcomeLearning(input: {
  plans: TradePlan[];
  learningOutcomes: LearningOutcome[];
  observations: ObservationRecord[];
}): PlanOutcomeLearningReconcileRow[] {
  const loByPlan = new Map<string, LearningOutcome>();
  for (const lo of input.learningOutcomes) {
    if (!lo.planId || lo.tradeId) continue;
    loByPlan.set(lo.planId.toUpperCase(), lo);
  }
  const obsByPlan = new Map<string, ObservationRecord>();
  for (const obs of input.observations) {
    if (!obs.planId) continue;
    obsByPlan.set(obs.planId.toUpperCase(), obs);
  }

  const rows: PlanOutcomeLearningReconcileRow[] = [];
  for (const plan of input.plans) {
    if (!plan.outcome?.recordedAt) continue;
    const lo = loByPlan.get(plan.id.toUpperCase());
    const obs = obsByPlan.get(plan.id.toUpperCase());
    const verify = verifyPlanOutcomeLearningLinks(plan, lo, obs);
    const needsRepair =
      !verify.ok ||
      verify.effectiveStatus === "pending" ||
      verify.effectiveStatus === "failed" ||
      plan.outcome.learningSyncStatus === "pending" ||
      plan.outcome.learningSyncStatus === "failed";
    rows.push({
      planId: plan.id,
      ticker: plan.ticker,
      effectiveStatus: verify.effectiveStatus,
      issues: verify.issues,
      needsRepair,
    });
  }
  return rows;
}

export function planNeedsLearningSyncRepair(
  plan: TradePlan,
  learningOutcome?: LearningOutcome,
  observation?: ObservationRecord
): boolean {
  if (!plan.outcome?.recordedAt) return false;
  const verify = verifyPlanOutcomeLearningLinks(plan, learningOutcome, observation);
  if (
    plan.outcome.learningSyncStatus === "pending" ||
    plan.outcome.learningSyncStatus === "failed"
  ) {
    return true;
  }
  return !verify.ok || verify.effectiveStatus !== "complete";
}
