/**
 * External Position — capital held outside the MTA Scout→Trade pipeline.
 * 26-13 / hardened 26-14. Never a Trade / Scout / Stock File; never experiment-eligible.
 *
 * Cost basis: average_cost only. FIFO / specific-lot is NOT implemented.
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

/** Only average_cost is implemented. Room for lots later — not in this PR. */
export const COST_BASIS_METHODS = ["average_cost"] as const;
export type CostBasisMethod = (typeof COST_BASIS_METHODS)[number];

export const VALUATION_SOURCES = [
  "manual",
  "import",
  "unspecified",
] as const;
export type ValuationSource = (typeof VALUATION_SOURCES)[number];

export const SETTLEMENT_STATUSES = [
  "pending_settlement",
  "settled",
] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

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
  /** Stable idempotency key (reductionId or derived from executionReference). */
  id: string;
  /** Optional alternate execution identity supplied by Apply. */
  executionReference?: string;
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
  /** Sale proceeds start pending; cash only after settle. */
  settlementStatus: SettlementStatus;
  settledAt?: string;
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
  /** Declared method — average_cost only (no tax-lot accuracy). */
  costBasisMethod: CostBasisMethod;
  /** Server-owned: shares × averageCost under average_cost. */
  costBasis: number;
  currentPrice?: number;
  currentMarketValue?: number;
  unrealizedPnL?: number;
  unrealizedPnLPercent?: number;
  valuationSource?: ValuationSource;
  capitalTreatment: ExternalCapitalTreatment;
  liquidityStatus: ExternalLiquidityStatus;
  experimentEligible: false;
  scoutLinked: false;
  openedAt: string;
  /** Set only when a new currentPrice is supplied. */
  lastValuationAt?: string;
  reviewAt?: string;
  notes?: string;
  exitPlan?: ExternalExitPlan;
  reductions: ExternalPositionReduction[];
  /** Informational sum of sale proceeds (pending + settled). Never auto-added to cash. */
  cumulativeSaleProceeds: number;
  cumulativeRealizedPnL: number;
  /** Optimistic concurrency token. */
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type ExternalPositionValuation = {
  costBasis: number;
  currentMarketValue: number | undefined;
  unrealizedPnL: number | undefined;
  unrealizedPnLPercent: number | undefined;
};

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

/**
 * Recompute derived valuation fields.
 * Refresh lastValuationAt / valuationSource only when refreshValuationTime is true
 * (i.e. a new currentPrice was supplied).
 */
export function applyValuationToPosition(
  position: ExternalPosition,
  opts?: {
    currentPrice?: number;
    refreshValuationTime?: boolean;
    valuationSource?: ValuationSource;
    observedAt?: string;
  }
): ExternalPosition {
  const price =
    opts?.currentPrice !== undefined ? opts.currentPrice : position.currentPrice;
  const v = computeExternalPositionValuation({
    shares: position.shares,
    averageCost: position.averageCost,
    currentPrice: price,
  });
  const refresh = opts?.refreshValuationTime === true;
  return {
    ...position,
    costBasisMethod: position.costBasisMethod ?? "average_cost",
    currentPrice: price,
    costBasis: v.costBasis,
    currentMarketValue: v.currentMarketValue,
    unrealizedPnL: v.unrealizedPnL,
    unrealizedPnLPercent: v.unrealizedPnLPercent,
    lastValuationAt: refresh
      ? opts?.observedAt ?? new Date().toISOString()
      : position.lastValuationAt,
    valuationSource: refresh
      ? opts?.valuationSource ?? "manual"
      : position.valuationSource,
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
  if (!(executionPrice > 0) || !Number.isFinite(executionPrice)) {
    throw new Error("executionPrice must be a positive number");
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

export function sumPendingSettlementProceeds(
  positions: ExternalPosition[]
): number {
  let sum = 0;
  for (const p of positions) {
    for (const r of p.reductions ?? []) {
      if (r.settlementStatus === "pending_settlement") sum += r.proceeds;
    }
  }
  return sum;
}

export function sumSettledProceeds(positions: ExternalPosition[]): number {
  let sum = 0;
  for (const p of positions) {
    for (const r of p.reductions ?? []) {
      if (r.settlementStatus === "settled") sum += r.proceeds;
    }
  }
  return sum;
}

/** Compatible status ↔ capitalTreatment pairs. */
export function assertCompatibleCapitalState(
  status: ExternalPositionStatus,
  treatment: ExternalCapitalTreatment
): void {
  if (status === "archived" && treatment === "invested") {
    throw new Error(
      "incompatible status/capitalTreatment: archived cannot be invested"
    );
  }
  if (
    (status === "open" || status === "partially_reduced") &&
    treatment === "released"
  ) {
    throw new Error(
      "incompatible status/capitalTreatment: open/partially_reduced cannot be released"
    );
  }
}

export function isValuationStale(
  lastValuationAt: string | undefined,
  maxAgeMs = 7 * 24 * 60 * 60 * 1000
): boolean {
  if (!lastValuationAt) return true;
  const t = Date.parse(lastValuationAt);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > maxAgeMs;
}
