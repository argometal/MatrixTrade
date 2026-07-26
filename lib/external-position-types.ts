/**
 * External Position — capital held outside the MTA Scout→Trade pipeline.
 * Prompt 26-13. Never a Trade / Scout / Stock File; never experiment-eligible.
 */

export const EXTERNAL_POSITION_STATUSES = [
  "open",
  "partially_reduced",
  "closed",
  "archived",
] as const;
export type ExternalPositionStatus = (typeof EXTERNAL_POSITION_STATUSES)[number];

export const EXTERNAL_ACQUISITION_SOURCES = [
  "external_program",
  "legacy_holding",
  "transferred_position",
  "manual_external",
  "other",
] as const;
export type ExternalAcquisitionSource =
  (typeof EXTERNAL_ACQUISITION_SOURCES)[number];

export const EXTERNAL_CAPITAL_TREATMENTS = [
  "invested",
  "restricted",
  "pending_release",
  "released",
] as const;
export type ExternalCapitalTreatment =
  (typeof EXTERNAL_CAPITAL_TREATMENTS)[number];

export const EXTERNAL_LIQUIDITY_STATUSES = [
  "liquid",
  "restricted",
  "unknown",
] as const;
export type ExternalLiquidityStatus =
  (typeof EXTERNAL_LIQUIDITY_STATUSES)[number];

export const EXIT_PLAN_STATUSES = [
  "draft",
  "active",
  "partially_executed",
  "completed",
  "cancelled",
  "expired",
] as const;
export type ExitPlanStatus = (typeof EXIT_PLAN_STATUSES)[number];

export type ExternalExitPlan = {
  positionId: string;
  targetPrice?: number;
  targetShares?: number;
  defensivePrice?: number;
  defensiveAction?: string;
  validUntil?: string;
  reviewRule?: string;
  notes?: string;
  status: ExitPlanStatus;
  updatedAt: string;
};

export type ExternalPositionReduction = {
  id: string;
  positionId: string;
  sharesReduced: number;
  executionPrice: number;
  executedAt: string;
  fees: number;
  proceeds: number;
  costBasisRemoved: number;
  realizedPnL: number;
  remainingShares: number;
  remainingCostBasis: number;
  remainingAverageCost: number;
  notes?: string;
  createdAt: string;
};

export type ExternalPosition = {
  id: string;
  ticker: string;
  status: ExternalPositionStatus;
  acquisitionSource: ExternalAcquisitionSource;
  shares: number;
  averageCost: number;
  /** Server-owned: shares × averageCost */
  costBasis: number;
  currentPrice?: number;
  /** Server-owned when currentPrice set */
  currentMarketValue?: number;
  unrealizedPnL?: number;
  unrealizedPnLPercent?: number;
  capitalTreatment: ExternalCapitalTreatment;
  liquidityStatus: ExternalLiquidityStatus;
  /** Always false — never contaminates experiment metrics. */
  experimentEligible: false;
  /** Always false — not linked to Scout pipeline. */
  scoutLinked: false;
  openedAt: string;
  lastValuationAt?: string;
  reviewAt?: string;
  notes?: string;
  exitPlan?: ExternalExitPlan;
  reductions: ExternalPositionReduction[];
  cumulativeReleasedProceeds: number;
  cumulativeRealizedPnL: number;
  createdAt: string;
  updatedAt: string;
};

export type ExternalPositionValuation = {
  costBasis: number;
  currentMarketValue: number | undefined;
  unrealizedPnL: number | undefined;
  unrealizedPnLPercent: number | undefined;
};

/** Deterministic server valuation — never trust client-computed fields. */
export function computeExternalPositionValuation(input: {
  shares: number;
  averageCost: number;
  currentPrice?: number;
}): ExternalPositionValuation {
  const shares = Number(input.shares);
  const averageCost = Number(input.averageCost);
  const costBasis = shares * averageCost;
  if (
    input.currentPrice === undefined ||
    input.currentPrice === null ||
    !Number.isFinite(Number(input.currentPrice))
  ) {
    return {
      costBasis,
      currentMarketValue: undefined,
      unrealizedPnL: undefined,
      unrealizedPnLPercent: undefined,
    };
  }
  const currentPrice = Number(input.currentPrice);
  const currentMarketValue = shares * currentPrice;
  const unrealizedPnL = currentMarketValue - costBasis;
  const unrealizedPnLPercent =
    costBasis === 0 ? undefined : (unrealizedPnL / costBasis) * 100;
  return {
    costBasis,
    currentMarketValue,
    unrealizedPnL,
    unrealizedPnLPercent,
  };
}

export function applyValuationToPosition(
  position: ExternalPosition,
  currentPrice?: number
): ExternalPosition {
  const price =
    currentPrice !== undefined ? currentPrice : position.currentPrice;
  const v = computeExternalPositionValuation({
    shares: position.shares,
    averageCost: position.averageCost,
    currentPrice: price,
  });
  return {
    ...position,
    currentPrice: price,
    costBasis: v.costBasis,
    currentMarketValue: v.currentMarketValue,
    unrealizedPnL: v.unrealizedPnL,
    unrealizedPnLPercent: v.unrealizedPnLPercent,
    lastValuationAt:
      price !== undefined ? new Date().toISOString() : position.lastValuationAt,
    experimentEligible: false,
    scoutLinked: false,
  };
}

export type ExternalReductionComputation = {
  proceeds: number;
  costBasisRemoved: number;
  realizedPnL: number;
  remainingShares: number;
  remainingCostBasis: number;
  remainingAverageCost: number;
  nextStatus: ExternalPositionStatus;
};

export function computeExternalPositionReduction(input: {
  shares: number;
  averageCost: number;
  sharesReduced: number;
  executionPrice: number;
  fees?: number;
}): ExternalReductionComputation {
  const shares = Number(input.shares);
  const averageCost = Number(input.averageCost);
  const sharesReduced = Number(input.sharesReduced);
  const executionPrice = Number(input.executionPrice);
  const fees =
    input.fees === undefined || input.fees === null ? 0 : Number(input.fees);

  if (!(sharesReduced > 0) || !Number.isFinite(sharesReduced)) {
    throw new Error("sharesReduced must be a positive number");
  }
  if (sharesReduced > shares + 1e-12) {
    throw new Error(
      `sharesReduced ${sharesReduced} exceeds available shares ${shares}`
    );
  }
  if (!(executionPrice >= 0) || !Number.isFinite(executionPrice)) {
    throw new Error("executionPrice must be a non-negative number");
  }
  if (!(fees >= 0) || !Number.isFinite(fees)) {
    throw new Error("fees must be a non-negative number");
  }

  const proceeds = sharesReduced * executionPrice - fees;
  const costBasisRemoved = sharesReduced * averageCost;
  const realizedPnL = proceeds - costBasisRemoved;
  const remainingShares = Math.max(0, shares - sharesReduced);
  const remainingAverageCost = remainingShares > 0 ? averageCost : 0;
  const remainingCostBasis = remainingShares * remainingAverageCost;
  const nextStatus: ExternalPositionStatus =
    remainingShares > 0 ? "partially_reduced" : "closed";

  return {
    proceeds,
    costBasisRemoved,
    realizedPnL,
    remainingShares,
    remainingCostBasis,
    remainingAverageCost,
    nextStatus,
  };
}

export function isOpenExternalPosition(p: ExternalPosition): boolean {
  return p.status === "open" || p.status === "partially_reduced";
}
