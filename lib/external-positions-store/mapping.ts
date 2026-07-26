import type {
  CostBasisMethod,
  ExternalAcquisitionSource,
  ExternalCapitalTreatment,
  ExternalExitPlan,
  ExternalLiquidityStatus,
  ExternalPosition,
  ExternalPositionReduction,
  ExternalPositionStatus,
  ExitPlanStatus,
  ValuationSource,
} from "../external-position-types";

export type ExternalPositionRow = {
  id: string;
  ticker: string;
  status: string;
  acquisition_source: string;
  shares: number;
  average_cost: number;
  cost_basis_method: string;
  cost_basis: number;
  current_price: number | null;
  current_market_value: number | null;
  unrealized_pnl: number | null;
  unrealized_pnl_percent: number | null;
  valuation_source: string | null;
  capital_treatment: string;
  liquidity_status: string;
  experiment_eligible: boolean;
  scout_linked: boolean;
  opened_at: string;
  last_valuation_at: string | null;
  review_at: string | null;
  notes: string | null;
  exit_plan: ExternalExitPlan | null;
  reductions: ExternalPositionReduction[];
  cumulative_sale_proceeds: number;
  cumulative_realized_pnl: number;
  revision: number;
  created_at: string;
  updated_at: string;
};

function num(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function str(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s || undefined;
}

function normalizeReduction(r: ExternalPositionReduction): ExternalPositionReduction {
  return {
    ...r,
    settlementStatus: r.settlementStatus ?? "pending_settlement",
  };
}

export function externalPositionRowToRecord(
  row: ExternalPositionRow & {
    cumulative_released_proceeds?: number;
  }
): ExternalPosition {
  const reductions = Array.isArray(row.reductions)
    ? row.reductions.map(normalizeReduction)
    : [];
  return {
    id: String(row.id).toUpperCase(),
    ticker: String(row.ticker).toUpperCase(),
    status: row.status as ExternalPositionStatus,
    acquisitionSource: row.acquisition_source as ExternalAcquisitionSource,
    shares: Number(row.shares),
    averageCost: Number(row.average_cost),
    costBasisMethod: (row.cost_basis_method as CostBasisMethod) || "average_cost",
    costBasis: Number(row.cost_basis),
    currentPrice: num(row.current_price),
    currentMarketValue: num(row.current_market_value),
    unrealizedPnL: num(row.unrealized_pnl),
    unrealizedPnLPercent: num(row.unrealized_pnl_percent),
    valuationSource: (str(row.valuation_source) as ValuationSource) || undefined,
    capitalTreatment: row.capital_treatment as ExternalCapitalTreatment,
    liquidityStatus: row.liquidity_status as ExternalLiquidityStatus,
    experimentEligible: false,
    scoutLinked: false,
    openedAt: String(row.opened_at),
    lastValuationAt: str(row.last_valuation_at),
    reviewAt: str(row.review_at),
    notes: row.notes === null ? undefined : str(row.notes),
    exitPlan: row.exit_plan
      ? {
          ...row.exit_plan,
          positionId: String(row.exit_plan.positionId).toUpperCase(),
          status: row.exit_plan.status as ExitPlanStatus,
        }
      : undefined,
    reductions,
    cumulativeSaleProceeds: Number(
      row.cumulative_sale_proceeds ??
        row.cumulative_released_proceeds ??
        0
    ),
    cumulativeRealizedPnL: Number(row.cumulative_realized_pnl ?? 0),
    revision: Number(row.revision ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function externalPositionToRow(
  row: ExternalPosition
): ExternalPositionRow {
  return {
    id: row.id.toUpperCase(),
    ticker: row.ticker.toUpperCase(),
    status: row.status,
    acquisition_source: row.acquisitionSource,
    shares: row.shares,
    average_cost: row.averageCost,
    cost_basis_method: row.costBasisMethod ?? "average_cost",
    cost_basis: row.costBasis,
    current_price: row.currentPrice ?? null,
    current_market_value: row.currentMarketValue ?? null,
    unrealized_pnl: row.unrealizedPnL ?? null,
    unrealized_pnl_percent: row.unrealizedPnLPercent ?? null,
    valuation_source: row.valuationSource ?? null,
    capital_treatment: row.capitalTreatment,
    liquidity_status: row.liquidityStatus,
    experiment_eligible: false,
    scout_linked: false,
    opened_at: row.openedAt,
    last_valuation_at: row.lastValuationAt ?? null,
    review_at: row.reviewAt ?? null,
    notes: row.notes ?? null,
    exit_plan: row.exitPlan ?? null,
    reductions: row.reductions ?? [],
    cumulative_sale_proceeds: row.cumulativeSaleProceeds ?? 0,
    cumulative_realized_pnl: row.cumulativeRealizedPnL ?? 0,
    revision: row.revision ?? 0,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}
