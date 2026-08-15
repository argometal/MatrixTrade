import { getPlansStore } from "./plans-store";
import { createTradeFromProbePlan } from "./probe-to-trade";
import { computePlannedRR, validatePlanAgainstThesis } from "./plan-risk";
import {
  appendDecision,
  deriveLifecycleFromPlan,
  parseDecisionInput,
  parseLayeredEntryInput,
  parseProbeInput,
  type DecisionInput,
} from "./scout-decision";
import {
  activateProbe,
  cancelProbe,
  convertProbe,
  stopProbe,
} from "./scout-probe";
import type { ProbeInput } from "./scout-probe-types";
import {
  applyLayeredEntryUpdate,
  type LayeredEntryInput,
  type LayeredEntryUpdateInput,
} from "./layered-entry";
import { canLinkThesisToPlan, getStockThesisById } from "./stock-theses";
import {
  isCanonicalPlanId,
  PlanIdCollisionError,
} from "./plan-id";
import {
  PLAN_TIMEFRAME_ORDER,
  PLAN_TIMEFRAMES,
  type PlanTimeframe,
  type RecordPlanOutcomeInput,
  type SavePlanInput,
  type TradePlan,
} from "./plan-types";

export {
  formatPlanId,
  isCanonicalPlanId,
  maxPlanIdNumber,
  nextPlanId,
  parsePlanIdNumber,
  PlanIdCollisionError,
  PLAN_ID_PATTERN,
} from "./plan-id";

export function smallestTimeframe(frames: PlanTimeframe[]): PlanTimeframe | null {
  if (frames.length === 0) return null;
  return frames.reduce((smallest, frame) =>
    PLAN_TIMEFRAME_ORDER[frame] > PLAN_TIMEFRAME_ORDER[smallest] ? frame : smallest
  );
}

export function validatePlanTimeframes(
  analysisTimeframes: PlanTimeframe[],
  entryTimeframe: PlanTimeframe
): string | null {
  if (analysisTimeframes.length === 0) {
    return "Select at least one analysis timeframe.";
  }
  const smallest = smallestTimeframe(analysisTimeframes);
  if (smallest && entryTimeframe !== smallest) {
    return `Entry timeframe must be the smallest selected frame (${smallest}).`;
  }
  return null;
}

export function parsePlanTimeframes(raw: unknown): PlanTimeframe[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => String(item).trim())
    .filter((item): item is PlanTimeframe =>
      (PLAN_TIMEFRAMES as readonly string[]).includes(item)
    );
}

function shouldAutoExpire(plan: TradePlan, now = Date.now()): boolean {
  if (plan.status !== "watching" && plan.status !== "ready") return false;
  if (!plan.validUntil) return false;
  const until = Date.parse(plan.validUntil);
  return Number.isFinite(until) && until < now;
}

async function applyAutoExpire(plans: TradePlan[]): Promise<TradePlan[]> {
  const now = new Date().toISOString();
  let changed = false;
  const updated = plans.map((plan) => {
    if (!shouldAutoExpire(plan)) return plan;
    changed = true;
    return {
      ...plan,
      status: "expired" as const,
      updatedAt: now,
    };
  });
  if (changed) {
    await getPlansStore().upsertMany(updated.filter((p, i) => p !== plans[i]));
  }
  return updated;
}

export async function getPlans(): Promise<TradePlan[]> {
  const plans = await getPlansStore().readAll();
  return applyAutoExpire(plans);
}

export async function getPlanById(id: string): Promise<TradePlan | undefined> {
  const plans = await getPlans();
  return plans.find((p) => p.id === id.toUpperCase());
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseOptionalIso(value: unknown): string | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

export async function savePlan(input: SavePlanInput): Promise<{
  plan?: TradePlan;
  errors?: string[];
  warnings?: string[];
}> {
  const errors: string[] = [];
  const ticker = input.ticker.trim().toUpperCase();
  if (!ticker) errors.push("Ticker is required.");

  const analysisTimeframes = input.analysisTimeframes;
  const tfError = validatePlanTimeframes(analysisTimeframes, input.entryTimeframe);
  if (tfError) errors.push(tfError);

  let linkedThesis: Awaited<ReturnType<typeof getStockThesisById>> | undefined;
  if (input.stockThesisId?.trim()) {
    linkedThesis = await getStockThesisById(input.stockThesisId.trim());
    if (!linkedThesis) {
      errors.push("Linked stock thesis not found.");
    } else {
      const linkCheck = canLinkThesisToPlan(linkedThesis);
      if (!linkCheck.allowed) {
        errors.push(linkCheck.error ?? "Cannot link plan to this stock thesis.");
      }
    }
  }

  if (errors.length > 0) return { errors };

  const store = getPlansStore();
  const plans = await getPlans();
  const now = new Date().toISOString();
  const requestedId = input.id?.trim() ? input.id.trim().toUpperCase() : undefined;
  const existing = requestedId
    ? plans.find((p) => p.id === requestedId)
    : undefined;

  if (requestedId && !existing && !isCanonicalPlanId(requestedId)) {
    return { errors: [`Invalid plan id ${requestedId}; expected PLAN-<number>.`] };
  }

  const plannedEntry = parseOptionalNumber(input.plannedEntry);
  const stopPrice = parseOptionalNumber(input.stopPrice);
  const targetPrice = parseOptionalNumber(input.targetPrice);
  let plannedRR = parseOptionalNumber(input.plannedRR);

  if (plannedEntry !== undefined && stopPrice !== undefined && targetPrice !== undefined) {
    const computed = computePlannedRR(plannedEntry, stopPrice, targetPrice);
    if (computed) plannedRR = computed.rr;
  }

  const isCreate = !existing;
  let planId: string;
  if (existing) {
    planId = existing.id;
  } else if (requestedId) {
    // Explicit new id (imports/tests): insert-only; never overwrite.
    planId = requestedId;
  } else {
    planId = await store.allocateNextPlanId();
  }

  const plan: TradePlan = {
    id: planId,
    ticker,
    playbookId: input.playbookId?.trim() || undefined,
    stockThesisId: input.stockThesisId?.trim().toUpperCase() || existing?.stockThesisId,
    status: input.status ?? existing?.status ?? "watching",
    analysisTimeframes,
    entryTimeframe: input.entryTimeframe,
    plannedEntry,
    supportLevel: parseOptionalNumber(input.supportLevel),
    stopPrice,
    targetPrice,
    plannedRR,
    validFrom: parseOptionalIso(input.validFrom) ?? existing?.validFrom,
    validUntil: parseOptionalIso(input.validUntil) ?? existing?.validUntil,
    thesis: input.thesis?.trim() || undefined,
    chatNotes: input.chatNotes?.trim() || undefined,
    executionInstruction:
      input.executionInstruction?.trim() || existing?.executionInstruction,
    linkedTradeId: existing?.linkedTradeId,
    outcome: existing?.outcome,
    decision: existing?.decision,
    decisionHistory: existing?.decisionHistory,
    scoutLifecycle: existing?.scoutLifecycle,
    probe: existing?.probe,
    layeredEntry: existing?.layeredEntry,
    executionMethod:
      existing?.executionMethod ?? existing?.layeredEntry?.executionMethod,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  try {
    if (isCreate) {
      await store.insert(plan);
    } else {
      await store.upsert(plan);
    }
  } catch (err) {
    if (err instanceof PlanIdCollisionError) {
      return { errors: [err.message] };
    }
    throw err;
  }

  const warnings: string[] = [];
  if (linkedThesis) {
    const linkCheck = canLinkThesisToPlan(linkedThesis);
    if (linkCheck.warning) warnings.push(linkCheck.warning);
    const thesisCheck = validatePlanAgainstThesis(
      { entry: plannedEntry, stop: stopPrice, target: targetPrice },
      linkedThesis.riskRules
    );
    if (thesisCheck.warning) warnings.push(thesisCheck.warning);
  }

  return { plan, warnings: warnings.length > 0 ? warnings : undefined };
}

export async function updatePlanStatus(
  id: string,
  status: TradePlan["status"],
  linkedTradeId?: string
): Promise<{ plan?: TradePlan; errors?: string[] }> {
  const plan = await getPlanById(id);
  if (!plan) return { errors: ["Plan not found."] };

  const updated: TradePlan = {
    ...plan,
    status,
    linkedTradeId: linkedTradeId ?? plan.linkedTradeId,
    updatedAt: new Date().toISOString(),
  };
  await getPlansStore().upsert(updated);
  return { plan: updated };
}

export async function recordPlanOutcome(
  id: string,
  input: RecordPlanOutcomeInput
): Promise<{ plan?: TradePlan; errors?: string[] }> {
  // UPL preferred path — outcomeKind drives server-derived R.
  if (input.outcomeKind) {
    const { applyPlanOutcomeProposal } = await import("./plan-outcome");
    const result = await applyPlanOutcomeProposal({
      planId: id.toUpperCase(),
      outcomeKind: input.outcomeKind,
      entryReached: input.entryReached ?? input.entryTriggered,
      stopReachedBeforeTarget:
        input.stopReachedBeforeTarget ?? input.stopTriggered,
      targetReachedBeforeStop:
        input.targetReachedBeforeStop ?? input.targetTriggered,
      nonExecutionReason: input.nonExecutionReason,
      notes: input.notes ?? input.lesson,
      evidenceRefs: input.evidenceRefs ?? [],
      createdBy: input.createdBy,
    });
    return { plan: result.plan, errors: result.errors };
  }

  // Expanded counterfactual path (LEARNING-001 when status provided).
  if (input.status) {
    const { persistPlanOutcome } = await import("./plan-outcome");
    const result = await persistPlanOutcome({
      planId: id.toUpperCase(),
      status: input.status,
      tradeExecuted: input.tradeExecuted ?? false,
      entryTriggered: input.entryTriggered ?? null,
      stopTriggered: input.stopTriggered ?? null,
      targetTriggered: input.targetTriggered ?? null,
      theoreticalResultR: input.theoreticalResultR ?? null,
      realizedResultR: input.tradeExecuted ? (input.realizedResultR ?? 0) : 0,
      outcomeSource: input.outcomeSource ?? "manual_review",
      evidenceStatus: input.evidenceStatus ?? "partial",
      notes: input.notes ?? input.lesson,
      evidenceRefs: input.evidenceRefs ?? [],
      createdBy: input.createdBy,
      reason: input.reason,
      strategyStillValid: input.strategyStillValid,
      externalFactors: input.externalFactors?.filter(Boolean),
      lesson: input.lesson?.trim() || undefined,
    });
    return { plan: result.plan, errors: result.errors };
  }

  const plan = await getPlanById(id);
  if (!plan) return { errors: ["Plan not found."] };
  if (plan.status !== "failed" && plan.status !== "expired" && plan.status !== "skipped") {
    return { errors: ["Outcome can only be recorded for failed, expired, or skipped plans."] };
  }

  const updated: TradePlan = {
    ...plan,
    outcome: {
      planId: plan.id,
      recordedAt: new Date().toISOString(),
      reason: input.reason,
      strategyStillValid: input.strategyStillValid,
      externalFactors: input.externalFactors?.filter(Boolean),
      lesson: input.lesson?.trim() || undefined,
      notes: input.lesson?.trim() || undefined,
      tradeExecuted: false,
      realizedResultR: 0,
      evidenceRefs: [],
      updatedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
  await getPlansStore().upsert(updated);

  try {
    const { upsertLearningOutcomeFromPlan } = await import("./learning-outcome");
    const { startObservationForPlanMiss } = await import("./observation");
    const learning = await upsertLearningOutcomeFromPlan(updated);
    if (
      learning &&
      (learning.kind === "missed_opportunity" ||
        learning.kind === "expired" ||
        learning.kind === "cancelled" ||
        learning.kind === "unexecuted_plan_loss")
    ) {
      await startObservationForPlanMiss(updated, { learningOutcomeId: learning.id });
    }
  } catch {
    // Best-effort learning path.
  }

  return { plan: updated };
}

export async function recordScoutDecision(
  planId: string,
  input: DecisionInput,
  probeInput?: ProbeInput,
  layeredEntryInput?: LayeredEntryInput
): Promise<{ plan?: TradePlan; errors?: string[] }> {
  const plan = await getPlanById(planId);
  if (!plan) return { errors: ["Plan not found."] };

  const result = appendDecision(plan, input, probeInput, layeredEntryInput);
  if (result.errors?.length) return { errors: result.errors };

  const withLifecycle: TradePlan = {
    ...result.plan,
    scoutLifecycle: deriveLifecycleFromPlan(result.plan),
  };
  await getPlansStore().upsert(withLifecycle);
  return { plan: withLifecycle };
}

export async function recordScoutDecisionFromProposal(
  proposal: Record<string, unknown>
): Promise<{ plan?: TradePlan; errors?: string[] }> {
  const { applyDecisionUpdateFromProposal } = await import("./scout-plan-repair");
  return applyDecisionUpdateFromProposal(proposal);
}

function parseLayeredEntryUpdateInput(
  proposal: Record<string, unknown>
): LayeredEntryUpdateInput {
  const input: LayeredEntryUpdateInput = {};
  if (proposal.filledThroughIndex !== undefined) {
    input.filledThroughIndex = Number(proposal.filledThroughIndex);
  }
  if (proposal.status) {
    input.status = String(proposal.status) as LayeredEntryUpdateInput["status"];
  }
  return input;
}

export async function recordLayeredEntryFromProposal(
  proposal: Record<string, unknown>
): Promise<{ plan?: TradePlan; errors?: string[] }> {
  const planId = String(proposal.planId ?? "").trim().toUpperCase();
  if (!planId) return { errors: ["proposal.planId required"] };

  const plan = await getPlanById(planId);
  if (!plan) return { errors: ["Plan not found."] };

  const input = parseLayeredEntryUpdateInput(proposal);
  const result = applyLayeredEntryUpdate(plan, input);
  if (result.errors?.length) return { errors: result.errors };

  const updated: TradePlan = {
    ...result.plan!,
    scoutLifecycle: deriveLifecycleFromPlan(result.plan!),
    updatedAt: new Date().toISOString(),
  };
  await getPlansStore().upsert(updated);
  return { plan: updated };
}

export async function transitionProbe(
  planId: string,
  action: "activate" | "convert" | "cancel" | "stop"
): Promise<{ plan?: TradePlan; tradeId?: string; errors?: string[] }> {
  const plan = await getPlanById(planId);
  if (!plan) return { errors: ["Plan not found."] };

  if (action === "convert") {
    const tradeResult = await createTradeFromProbePlan(plan);
    if (tradeResult.errors?.length) return { errors: tradeResult.errors };
    return { plan: tradeResult.plan, tradeId: tradeResult.trade?.id };
  }

  let result: { plan?: TradePlan; errors?: string[] };
  switch (action) {
    case "activate":
      result = activateProbe(plan);
      break;
    case "cancel":
      result = cancelProbe(plan);
      break;
    case "stop":
      result = stopProbe(plan);
      break;
    default:
      return { errors: ["Unknown probe action."] };
  }

  if (result.errors?.length) return result;
  const updated: TradePlan = {
    ...result.plan!,
    scoutLifecycle: deriveLifecycleFromPlan(result.plan!),
    updatedAt: new Date().toISOString(),
  };
  await getPlansStore().upsert(updated);
  return { plan: updated };
}
