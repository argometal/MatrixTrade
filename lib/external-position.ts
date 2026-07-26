/**
 * External Position domain services — create / update / reduce / settle / exit plan.
 * All mutations are intended to be invoked from Control → Apply Accept only.
 *
 * Cost basis: average_cost only (no FIFO / specific-lot).
 * Sale proceeds start as pending_settlement; settled cash only after settle.
 */
import {
  applyValuationToPosition,
  assertCompatibleCapitalState,
  computeExternalPositionReduction,
  type ExternalAcquisitionSource,
  type ExternalCapitalTreatment,
  type ExternalExitPlan,
  type ExternalLiquidityStatus,
  type ExternalPosition,
  type ExternalPositionReduction,
  type ExitPlanStatus,
  type ValuationSource,
} from "./external-position-types";
import {
  getExternalPositionById,
  nextExternalPositionId,
  upsertExternalPosition,
  upsertExternalPositionIfRevision,
  withExternalPositionLock,
} from "./external-position-store";
import { getExternalPositions } from "./external-position-store";

function assertIsoTimestamp(value: string | undefined, field: string): void {
  if (value === undefined) return;
  const t = Date.parse(value);
  if (!Number.isFinite(t) || Number.isNaN(t)) {
    throw new Error(`${field} must be a valid ISO timestamp`);
  }
}

function reductionIdentityKey(input: {
  reductionId?: string;
  executionReference?: string;
}): string {
  const id = input.reductionId?.trim();
  const ref = input.executionReference?.trim();
  if (id) return id;
  if (ref) return ref;
  throw new Error(
    "reductionId or executionReference is required for idempotent reduction"
  );
}

function findExistingReduction(
  position: ExternalPosition,
  identity: string
): ExternalPositionReduction | undefined {
  const needle = identity.toUpperCase();
  return position.reductions.find(
    (r) =>
      r.id.toUpperCase() === needle ||
      (r.executionReference !== undefined &&
        r.executionReference.toUpperCase() === needle)
  );
}

function reductionPayloadConflicts(
  existing: ExternalPositionReduction,
  input: {
    sharesReduced: number;
    executionPrice: number;
    fees: number;
    executedAt?: string;
  }
): boolean {
  if (existing.sharesReduced !== input.sharesReduced) return true;
  if (existing.executionPrice !== input.executionPrice) return true;
  if (existing.fees !== input.fees) return true;
  if (
    input.executedAt !== undefined &&
    existing.executedAt !== input.executedAt
  ) {
    return true;
  }
  return false;
}

export type CreateExternalPositionInput = {
  id?: string;
  ticker: string;
  shares: number;
  averageCost: number;
  currentPrice?: number;
  valuationSource?: ValuationSource;
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
  if (input.currentPrice !== undefined) {
    const price = Number(input.currentPrice);
    if (!(price > 0) || !Number.isFinite(price)) {
      throw new Error("currentPrice must be a positive number");
    }
  }
  assertIsoTimestamp(input.openedAt, "openedAt");
  assertIsoTimestamp(input.reviewAt, "reviewAt");

  const capitalTreatment = input.capitalTreatment ?? "invested";
  assertCompatibleCapitalState("open", capitalTreatment);

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
    costBasisMethod: "average_cost",
    costBasis: 0,
    capitalTreatment,
    liquidityStatus: input.liquidityStatus ?? "unknown",
    experimentEligible: false,
    scoutLinked: false,
    openedAt: input.openedAt ?? now,
    reviewAt: input.reviewAt,
    notes: input.notes,
    reductions: [],
    cumulativeSaleProceeds: 0,
    cumulativeRealizedPnL: 0,
    revision: 0,
    createdAt: now,
    updatedAt: now,
  };

  const valued =
    input.currentPrice !== undefined
      ? applyValuationToPosition(base, {
          currentPrice: Number(input.currentPrice),
          refreshValuationTime: true,
          valuationSource: input.valuationSource ?? "manual",
          observedAt: now,
        })
      : applyValuationToPosition(base);
  return upsertExternalPosition(valued);
}

export type UpdateExternalPositionInput = {
  id: string;
  currentPrice?: number;
  valuationSource?: ValuationSource;
  reviewAt?: string | null;
  notes?: string | null;
  liquidityStatus?: ExternalLiquidityStatus;
  capitalTreatment?: ExternalCapitalTreatment;
  acquisitionSource?: ExternalAcquisitionSource;
};

export async function updateExternalPosition(
  input: UpdateExternalPositionInput
): Promise<ExternalPosition> {
  return withExternalPositionLock(input.id, async () => {
    const existing = await getExternalPositionById(input.id);
    if (!existing) throw new Error(`External Position ${input.id} not found`);

    assertIsoTimestamp(
      input.reviewAt === null ? undefined : input.reviewAt ?? undefined,
      "reviewAt"
    );
    if (input.currentPrice !== undefined) {
      const price = Number(input.currentPrice);
      if (!(price > 0) || !Number.isFinite(price)) {
        throw new Error("currentPrice must be a positive number");
      }
    }

    const capitalTreatment =
      input.capitalTreatment !== undefined
        ? input.capitalTreatment
        : existing.capitalTreatment;
    assertCompatibleCapitalState(existing.status, capitalTreatment);

    let next: ExternalPosition = {
      ...existing,
      experimentEligible: false,
      scoutLinked: false,
      costBasisMethod: existing.costBasisMethod ?? "average_cost",
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

    const priceSupplied = input.currentPrice !== undefined;
    next = applyValuationToPosition(next, {
      currentPrice: priceSupplied
        ? Number(input.currentPrice)
        : next.currentPrice,
      refreshValuationTime: priceSupplied,
      valuationSource: priceSupplied
        ? input.valuationSource ?? "manual"
        : undefined,
      observedAt: priceSupplied ? new Date().toISOString() : undefined,
    });

    return upsertExternalPositionIfRevision(next, existing.revision);
  });
}

export type ReduceExternalPositionInput = {
  positionId: string;
  /** Stable idempotency key — required unless executionReference is set. */
  reductionId?: string;
  /** Alternate stable execution identity. */
  executionReference?: string;
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
  idempotentReplay?: boolean;
}> {
  const identity = reductionIdentityKey(input);

  return withExternalPositionLock(input.positionId, async () => {
    const existing = await getExternalPositionById(input.positionId);
    if (!existing) {
      throw new Error(`External Position ${input.positionId} not found`);
    }
    if (existing.status === "closed" || existing.status === "archived") {
      throw new Error(
        `External Position ${existing.id} is ${existing.status} — cannot reduce`
      );
    }

    const fees =
      input.fees === undefined || input.fees === null
        ? 0
        : Number(input.fees);
    const sharesReduced = Number(input.sharesReduced);
    const executionPrice = Number(input.executionPrice);
    assertIsoTimestamp(input.executedAt, "executedAt");

    const prior = findExistingReduction(existing, identity);
    if (prior) {
      if (
        reductionPayloadConflicts(prior, {
          sharesReduced,
          executionPrice,
          fees,
          executedAt: input.executedAt,
        })
      ) {
        throw new Error(
          `reduction identity ${identity} already accepted with conflicting payload`
        );
      }
      return {
        position: existing,
        reduction: prior,
        idempotentReplay: true,
      };
    }

    const calc = computeExternalPositionReduction({
      shares: existing.shares,
      averageCost: existing.averageCost,
      sharesReduced,
      executionPrice,
      fees,
    });

    const now = new Date().toISOString();
    const executedAt = input.executedAt ?? now;
    const reduction: ExternalPositionReduction = {
      id: identity,
      executionReference: input.executionReference?.trim() || undefined,
      positionId: existing.id,
      sharesReduced,
      executionPrice,
      executedAt,
      fees,
      proceeds: calc.proceeds,
      costBasisRemoved: calc.costBasisRemoved,
      realizedPnL: calc.realizedPnL,
      remainingShares: calc.remainingShares,
      remainingCostBasis: calc.remainingCostBasis,
      remainingAverageCost: calc.remainingAverageCost,
      settlementStatus: "pending_settlement",
      notes: input.notes,
      createdAt: now,
    };

    let nextStatus = calc.nextStatus;
    let capitalTreatment: ExternalCapitalTreatment =
      nextStatus === "closed" ? "pending_release" : existing.capitalTreatment;
    assertCompatibleCapitalState(nextStatus, capitalTreatment);

    let exitPlan = existing.exitPlan;
    if (
      nextStatus === "closed" &&
      exitPlan &&
      (exitPlan.status === "active" ||
        exitPlan.status === "draft" ||
        exitPlan.status === "partially_executed")
    ) {
      exitPlan = { ...exitPlan, status: "completed", updatedAt: now };
    }

    let next: ExternalPosition = {
      ...existing,
      shares: calc.remainingShares,
      averageCost: calc.remainingAverageCost,
      costBasis: calc.remainingCostBasis,
      costBasisMethod: existing.costBasisMethod ?? "average_cost",
      status: nextStatus,
      capitalTreatment,
      exitPlan,
      reductions: [...existing.reductions, reduction],
      cumulativeSaleProceeds:
        (existing.cumulativeSaleProceeds ?? 0) + calc.proceeds,
      cumulativeRealizedPnL: existing.cumulativeRealizedPnL + calc.realizedPnL,
      experimentEligible: false,
      scoutLinked: false,
      updatedAt: now,
    };
    // Recompute valuation from remaining shares; do not refresh valuation time.
    next = applyValuationToPosition(next);

    const position = await upsertExternalPositionIfRevision(
      next,
      existing.revision
    );
    return { position, reduction };
  });
}

export type SettleExternalPositionProceedsInput = {
  positionId: string;
  /** Settle one reduction; omit to settle all pending on the position. */
  reductionId?: string;
  settledAt?: string;
};

export async function settleExternalPositionProceeds(
  input: SettleExternalPositionProceedsInput
): Promise<{
  position: ExternalPosition;
  settledReductionIds: string[];
  settledProceeds: number;
}> {
  return withExternalPositionLock(input.positionId, async () => {
    const existing = await getExternalPositionById(input.positionId);
    if (!existing) {
      throw new Error(`External Position ${input.positionId} not found`);
    }
    assertIsoTimestamp(input.settledAt, "settledAt");
    const settledAt = input.settledAt ?? new Date().toISOString();
    const targetId = input.reductionId?.trim().toUpperCase();

    let settledProceeds = 0;
    const settledReductionIds: string[] = [];
    const reductions = existing.reductions.map((r) => {
      const match =
        targetId === undefined
          ? r.settlementStatus === "pending_settlement"
          : r.id.toUpperCase() === targetId ||
            (r.executionReference !== undefined &&
              r.executionReference.toUpperCase() === targetId);
      if (!match) return r;
      if (r.settlementStatus === "settled") {
        // Idempotent settle of already-settled row.
        settledReductionIds.push(r.id);
        return r;
      }
      settledProceeds += r.proceeds;
      settledReductionIds.push(r.id);
      return {
        ...r,
        settlementStatus: "settled" as const,
        settledAt,
      };
    });

    if (targetId && settledReductionIds.length === 0) {
      throw new Error(
        `reduction ${input.reductionId} not found on ${existing.id}`
      );
    }

    const anyPending = reductions.some(
      (r) => r.settlementStatus === "pending_settlement"
    );
    let capitalTreatment = existing.capitalTreatment;
    if (existing.status === "closed" && !anyPending) {
      capitalTreatment = "released";
    }
    assertCompatibleCapitalState(existing.status, capitalTreatment);

    const next: ExternalPosition = {
      ...existing,
      reductions,
      capitalTreatment,
      costBasisMethod: existing.costBasisMethod ?? "average_cost",
      experimentEligible: false,
      scoutLinked: false,
      updatedAt: new Date().toISOString(),
    };

    const position = await upsertExternalPositionIfRevision(
      next,
      existing.revision
    );
    return { position, settledReductionIds, settledProceeds };
  });
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
  return withExternalPositionLock(input.positionId, async () => {
    const existing = await getExternalPositionById(input.positionId);
    if (!existing) {
      throw new Error(`External Position ${input.positionId} not found`);
    }

    const now = new Date().toISOString();
    const prior = existing.exitPlan;
    const status = input.status ?? prior?.status ?? "draft";
    if (
      (existing.status === "closed" || existing.status === "archived") &&
      status === "active"
    ) {
      throw new Error(
        `closed/archived External Position ${existing.id} cannot receive an active exit plan`
      );
    }

    const targetShares =
      input.targetShares !== undefined
        ? Number(input.targetShares)
        : prior?.targetShares;
    if (
      targetShares !== undefined &&
      Number.isFinite(targetShares) &&
      targetShares > existing.shares + 1e-12
    ) {
      throw new Error(
        `exit plan targetShares ${targetShares} exceeds current position shares ${existing.shares}`
      );
    }

    for (const [field, value] of [
      ["targetPrice", input.targetPrice],
      ["defensivePrice", input.defensivePrice],
    ] as const) {
      if (value !== undefined && (!(Number(value) > 0) || !Number.isFinite(Number(value)))) {
        throw new Error(`${field} must be a positive number`);
      }
    }
    if (
      input.targetShares !== undefined &&
      (!(Number(input.targetShares) > 0) ||
        !Number.isFinite(Number(input.targetShares)))
    ) {
      throw new Error("targetShares must be a positive number");
    }
    assertIsoTimestamp(input.validUntil, "validUntil");

    const exitPlan: ExternalExitPlan = {
      positionId: existing.id,
      targetPrice:
        input.targetPrice !== undefined
          ? Number(input.targetPrice)
          : prior?.targetPrice,
      targetShares:
        input.targetShares !== undefined
          ? Number(input.targetShares)
          : prior?.targetShares,
      defensivePrice:
        input.defensivePrice !== undefined
          ? Number(input.defensivePrice)
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
      status,
      updatedAt: now,
    };

    return upsertExternalPositionIfRevision(
      {
        ...existing,
        exitPlan,
        costBasisMethod: existing.costBasisMethod ?? "average_cost",
        experimentEligible: false,
        scoutLinked: false,
        updatedAt: now,
      },
      existing.revision
    );
  });
}
