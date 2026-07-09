import { getPlansStore } from "./plans-store";
import {
  PLAN_TIMEFRAME_ORDER,
  PLAN_TIMEFRAMES,
  type PlanTimeframe,
  type RecordPlanOutcomeInput,
  type SavePlanInput,
  type TradePlan,
} from "./plan-types";

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

export function nextPlanId(plans: TradePlan[]): string {
  let max = 0;
  for (const plan of plans) {
    const match = /^PLAN-(\d+)$/i.exec(plan.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `PLAN-${String(max + 1).padStart(3, "0")}`;
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

export async function savePlan(input: SavePlanInput): Promise<{ plan?: TradePlan; errors?: string[] }> {
  const errors: string[] = [];
  const ticker = input.ticker.trim().toUpperCase();
  if (!ticker) errors.push("Ticker is required.");

  const analysisTimeframes = input.analysisTimeframes;
  const tfError = validatePlanTimeframes(analysisTimeframes, input.entryTimeframe);
  if (tfError) errors.push(tfError);

  if (errors.length > 0) return { errors };

  const plans = await getPlans();
  const now = new Date().toISOString();
  const existing = input.id ? plans.find((p) => p.id === input.id!.toUpperCase()) : undefined;

  const plan: TradePlan = {
    id: existing?.id ?? nextPlanId(plans),
    ticker,
    playbookId: input.playbookId?.trim() || undefined,
    status: existing?.status ?? "watching",
    analysisTimeframes,
    entryTimeframe: input.entryTimeframe,
    plannedEntry: parseOptionalNumber(input.plannedEntry),
    supportLevel: parseOptionalNumber(input.supportLevel),
    stopPrice: parseOptionalNumber(input.stopPrice),
    targetPrice: parseOptionalNumber(input.targetPrice),
    plannedRR: parseOptionalNumber(input.plannedRR),
    validFrom: parseOptionalIso(input.validFrom) ?? existing?.validFrom,
    validUntil: parseOptionalIso(input.validUntil) ?? existing?.validUntil,
    thesis: input.thesis?.trim() || undefined,
    chatNotes: input.chatNotes?.trim() || undefined,
    linkedTradeId: existing?.linkedTradeId,
    outcome: existing?.outcome,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await getPlansStore().upsert(plan);
  return { plan };
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
  const plan = await getPlanById(id);
  if (!plan) return { errors: ["Plan not found."] };
  if (plan.status !== "failed" && plan.status !== "expired" && plan.status !== "skipped") {
    return { errors: ["Outcome can only be recorded for failed, expired, or skipped plans."] };
  }

  const updated: TradePlan = {
    ...plan,
    outcome: {
      recordedAt: new Date().toISOString(),
      reason: input.reason,
      strategyStillValid: input.strategyStillValid,
      externalFactors: input.externalFactors?.filter(Boolean),
      lesson: input.lesson?.trim() || undefined,
    },
    updatedAt: new Date().toISOString(),
  };
  await getPlansStore().upsert(updated);
  return { plan: updated };
}
