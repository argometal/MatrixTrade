/**
 * External Position domain services — create / update / reduce / exit plan.
 * All mutations are intended to be invoked from Control → Apply Accept only.
 */
import {
  applyValuationToPosition,
  computeExternalPositionReduction,
  type ExternalAcquisitionSource,
  type ExternalCapitalTreatment,
  type ExternalExitPlan,
  type ExternalLiquidityStatus,
  type ExternalPosition,
  type ExternalPositionReduction,
  type ExitPlanStatus,
} from "./external-position-types";
import {
  getExternalPositionById,
  getExternalPositions,
  nextExternalPositionId,
  upsertExternalPosition,
} from "./external-position-store";

export type CreateExternalPositionInput = {
  id?: string;
  ticker: string;
  shares: number;
  averageCost: number;
  currentPrice?: number;
  acquisitionSource?: ExternalAcquisitionSource;
  capitalTreatment?: ExternalCapitalTreatment;
  liquidityStatus?: ExternalLiquidityStatus;
  openedAt?: string;
  reviewAt?: string;
  notes?: string;
};

export async function createExternalPosition(
  input: CreateExternalPositionInput
): Promise<ExternalPosition> {
  const ticker = input.ticker.trim().toUpperCase();
  if (!ticker) throw new Error("ticker required");
  const shares = Number(input.shares);
  const averageCost = Number(input.averageCost);
  if (!(shares > 0) || !Number.isFinite(shares)) {
    throw new Error("shares must be a positive number");
  }
  if (!(averageCost >= 0) || !Number.isFinite(averageCost)) {
    throw new Error("averageCost must be a non-negative number");
  }

  const all = await getExternalPositions();
  const now = new Date().toISOString();
  const id = (input.id?.trim() || nextExternalPositionId(all, ticker)).toUpperCase();
  if (all.some((p) => p.id.toUpperCase() === id)) {
    throw new Error(`External Position ${id} already exists`);
  }

  const base: ExternalPosition = {
    id,
    ticker,
    status: "open",
    acquisitionSource: input.acquisitionSource ?? "manual_external",
    shares,
    averageCost,
    costBasis: 0,
    capitalTreatment: input.capitalTreatment ?? "invested",
    liquidityStatus: input.liquidityStatus ?? "unknown",
    experimentEligible: false,
    scoutLinked: false,
    openedAt: input.openedAt ?? now,
    reviewAt: input.reviewAt,
    notes: input.notes,
    reductions: [],
    cumulativeReleasedProceeds: 0,
    cumulativeRealizedPnL: 0,
    createdAt: now,
    updatedAt: now,
  };

  const valued = applyValuationToPosition(base, input.currentPrice);
  return upsertExternalPosition(valued);
}

export type UpdateExternalPositionInput = {
  id: string;
  currentPrice?: number;
  reviewAt?: string | null;
  notes?: string | null;
  liquidityStatus?: ExternalLiquidityStatus;
  capitalTreatment?: ExternalCapitalTreatment;
  acquisitionSource?: ExternalAcquisitionSource;
};

export async function updateExternalPosition(
  input: UpdateExternalPositionInput
): Promise<ExternalPosition> {
  const existing = await getExternalPositionById(input.id);
  if (!existing) throw new Error(`External Position ${input.id} not found`);

  let next: ExternalPosition = {
    ...existing,
    experimentEligible: false,
    scoutLinked: false,
    updatedAt: new Date().toISOString(),
  };
  if (input.liquidityStatus !== undefined) {
    next.liquidityStatus = input.liquidityStatus;
  }
  if (input.capitalTreatment !== undefined) {
    next.capitalTreatment = input.capitalTreatment;
  }
  if (input.acquisitionSource !== undefined) {
    next.acquisitionSource = input.acquisitionSource;
  }
  if (input.reviewAt !== undefined) {
    next.reviewAt = input.reviewAt === null ? undefined : input.reviewAt;
  }
  if (input.notes !== undefined) {
    next.notes = input.notes === null ? undefined : input.notes;
  }
  if (input.currentPrice !== undefined) {
    next = applyValuationToPosition(next, input.currentPrice);
  } else {
    next = applyValuationToPosition(next, next.currentPrice);
  }
  return upsertExternalPosition(next);
}

export type ReduceExternalPositionInput = {
  positionId: string;
  sharesReduced: number;
  executionPrice: number;
  executedAt?: string;
  fees?: number;
  notes?: string;
};

export async function reduceExternalPosition(
  input: ReduceExternalPositionInput
): Promise<{
  position: ExternalPosition;
  reduction: ExternalPositionReduction;
}> {
  const existing = await getExternalPositionById(input.positionId);
  if (!existing) {
    throw new Error(`External Position ${input.positionId} not found`);
  }
  if (existing.status === "closed" || existing.status === "archived") {
    throw new Error(
      `External Position ${existing.id} is ${existing.status} — cannot reduce`
    );
  }

  const calc = computeExternalPositionReduction({
    shares: existing.shares,
    averageCost: existing.averageCost,
    sharesReduced: input.sharesReduced,
    executionPrice: input.executionPrice,
    fees: input.fees,
  });

  const now = new Date().toISOString();
  const executedAt = input.executedAt ?? now;
  const reductionId = `EXTRED-${existing.id}-${String(existing.reductions.length + 1).padStart(3, "0")}`;
  const reduction: ExternalPositionReduction = {
    id: reductionId,
    positionId: existing.id,
    sharesReduced: Number(input.sharesReduced),
    executionPrice: Number(input.executionPrice),
    executedAt,
    fees: input.fees === undefined ? 0 : Number(input.fees),
    proceeds: calc.proceeds,
    costBasisRemoved: calc.costBasisRemoved,
    realizedPnL: calc.realizedPnL,
    remainingShares: calc.remainingShares,
    remainingCostBasis: calc.remainingCostBasis,
    remainingAverageCost: calc.remainingAverageCost,
    notes: input.notes,
    createdAt: now,
  };

  let next: ExternalPosition = {
    ...existing,
    shares: calc.remainingShares,
    averageCost: calc.remainingAverageCost,
    costBasis: calc.remainingCostBasis,
    status: calc.nextStatus,
    capitalTreatment:
      calc.nextStatus === "closed" ? "released" : existing.capitalTreatment,
    reductions: [...existing.reductions, reduction],
    cumulativeReleasedProceeds:
      existing.cumulativeReleasedProceeds + calc.proceeds,
    cumulativeRealizedPnL: existing.cumulativeRealizedPnL + calc.realizedPnL,
    experimentEligible: false,
    scoutLinked: false,
    updatedAt: now,
  };
  next = applyValuationToPosition(next, next.currentPrice);
  const position = await upsertExternalPosition(next);
  return { position, reduction };
}

export type UpsertExternalExitPlanInput = {
  positionId: string;
  targetPrice?: number;
  targetShares?: number;
  defensivePrice?: number;
  defensiveAction?: string;
  validUntil?: string;
  reviewRule?: string;
  notes?: string;
  status?: ExitPlanStatus;
};

export async function upsertExternalExitPlan(
  input: UpsertExternalExitPlanInput
): Promise<ExternalPosition> {
  const existing = await getExternalPositionById(input.positionId);
  if (!existing) {
    throw new Error(`External Position ${input.positionId} not found`);
  }
  const now = new Date().toISOString();
  const prior = existing.exitPlan;
  const exitPlan: ExternalExitPlan = {
    positionId: existing.id,
    targetPrice:
      input.targetPrice !== undefined ? input.targetPrice : prior?.targetPrice,
    targetShares:
      input.targetShares !== undefined
        ? input.targetShares
        : prior?.targetShares,
    defensivePrice:
      input.defensivePrice !== undefined
        ? input.defensivePrice
        : prior?.defensivePrice,
    defensiveAction:
      input.defensiveAction !== undefined
        ? input.defensiveAction
        : prior?.defensiveAction,
    validUntil:
      input.validUntil !== undefined ? input.validUntil : prior?.validUntil,
    reviewRule:
      input.reviewRule !== undefined ? input.reviewRule : prior?.reviewRule,
    notes: input.notes !== undefined ? input.notes : prior?.notes,
    status: input.status ?? prior?.status ?? "draft",
    updatedAt: now,
  };

  return upsertExternalPosition({
    ...existing,
    exitPlan,
    experimentEligible: false,
    scoutLinked: false,
    updatedAt: now,
  });
}
