/** Layered limit entry — entry optimization, not thesis change or scaling after confirmation. */

export type LayeredEntryStatus =
  | "planned"
  | "partial"
  | "full"
  | "missed"
  | "active"
  | "cancelled";

export type LayerRole =
  | "starter"
  | "preferred"
  | "deep_pullback"
  | "confirmation"
  | "custom";

export type EntryConfidence = "low" | "medium" | "high";

export type StopModel = "common" | "per_layer";

/** How allocationPercent is interpreted for sizing. Old plans default to position_percent. */
export type LayerSizingMode = "position_percent" | "risk_percent";

export type LayeredEntryProposalSource = {
  human: boolean;
  ai: boolean;
  validatedByHuman: boolean;
};

/** Runtime-derived metrics — recomputed server-side; client values are not trusted. */
export type LayeredEntryLimitDerived = {
  riskPerShare: number;
  rewardPerShare: number;
  rr: number;
  /** Share of authorized risk this layer intends (risk_percent mode) or contributes. */
  riskSharePercent: number;
  plannedQuantity: number;
  plannedCapital: number;
  plannedRiskAmount: number;
};

export interface LayeredEntryLimit {
  id?: string;
  price: number;
  /**
   * Percent of the complete planned position (sum = 100%).
   * In risk_percent sizing mode, also used as share of authorizedRiskAmount.
   * Not automatically equal to monetary risk share in position_percent mode.
   */
  allocationPercent: number;
  role?: LayerRole;
  /** Per-layer stop — required when stopModel=per_layer. */
  stopPrice?: number;
  rationale?: string;
  structuralBasis?: string;
  confidence?: EntryConfidence;
  uncertaintyNote?: string;
  /** Whether this limit has executed. */
  filled?: boolean;
  fillPrice?: number;
  filledQuantity?: number;
  /** Deterministic Matrix output — strip and recompute on Apply. */
  derived?: LayeredEntryLimitDerived;
}

export interface LayeredEntryPlan {
  /** e.g. layered_limits — one execution variable per experiment. */
  executionMethod: "single_limit" | "layered_limits" | "market";
  limits: LayeredEntryLimit[];
  /** Hard rule — if all limits miss, trade is over. No market chase. */
  noChase: true;
  status: LayeredEntryStatus;
  /** Preferred default: common. Per-layer requires explicit choice. */
  stopModel?: StopModel;
  commonStopPrice?: number;
  primaryTargetPrice?: number;
  /** Monetary risk budget for the full plan (USD). */
  authorizedRiskAmount?: number;
  currency?: "USD";
  sizingMode?: LayerSizingMode;
  /** Weighted average fill price when any limit executes. */
  averageEntry?: number;
  blendedStopPrice?: number;
  /** Common-stop blended R at current/full fill. */
  blendedRR?: number;
  /** Per-layer stop portfolio R (totalReward/totalRisk) — not a fake averaged stop. */
  combinedRR?: number;
  /** Percent of planned allocation filled (0–100). */
  fillPercent?: number;
  riskUsedAmount?: number;
  riskUsedPercent?: number;
  /** First limit price — baseline for entry improvement metric. */
  firstLimitPrice?: number;
  /** Average improvement vs first limit (positive = better entry for long). */
  entryImprovementVsFirst?: number;
  cancelConditions?: string[];
  proposalSource?: LayeredEntryProposalSource;
  /** Convenience: any limit filled. */
  filled?: boolean;
}

export const LAYERED_ENTRY_STATUS_LABELS: Record<LayeredEntryStatus, string> = {
  planned: "Planned",
  partial: "Partial fill",
  full: "Full fill",
  missed: "Missed — no chase",
  active: "Active",
  cancelled: "Cancelled",
};

export const LAYER_ROLE_LABELS: Record<LayerRole, string> = {
  starter: "Starter",
  preferred: "Preferred",
  deep_pullback: "Deep pullback",
  confirmation: "Confirmation",
  custom: "Custom",
};

export const EXECUTION_EXPERIMENT_METRICS = [
  "AverageEntryPrice",
  "AverageImprovementVsFirstLimit",
  "FillPercent",
  "FullFillPercent",
  "PartialFillPercent",
  "MissedTradePercent",
  "AverageRR",
  "TradeOutcome",
  "Expectancy",
  "StarterOnlyFillPercent",
  "RiskUsedAmount",
  "UnusedAuthorizedRisk",
  "BlendedRR",
  "CombinedRR",
] as const;

export function computeLayeredAverageEntry(
  limits: LayeredEntryLimit[],
  filledThroughIndex: number
): number {
  let totalWeight = 0;
  let weightedSum = 0;
  for (let i = 0; i <= filledThroughIndex && i < limits.length; i++) {
    const limit = limits[i];
    totalWeight += limit.allocationPercent;
    weightedSum += limit.price * limit.allocationPercent;
  }
  if (totalWeight <= 0) return limits[0]?.price ?? 0;
  return weightedSum / totalWeight;
}

export function formatLayeredEntrySection(plan: {
  layeredEntry?: LayeredEntryPlan;
  stopPrice?: number;
  targetPrice?: number;
}): string {
  const entry = plan.layeredEntry;
  if (!entry) return "";
  const lines = [
    "=== LAYERED ENTRY ===",
    "Entry prices, stops and allocations are human/AI proposals. Matrix calculations are deterministic validation outputs and do not prove that the technical levels are valid.",
    `method:${entry.executionMethod}`,
    `status:${entry.status}`,
    `no_chase:yes`,
    `stop_model:${entry.stopModel ?? "common"}`,
    `sizing_mode:${entry.sizingMode ?? "position_percent"}`,
  ];
  if (entry.primaryTargetPrice !== undefined || plan.targetPrice !== undefined) {
    lines.push(`primary_target:${entry.primaryTargetPrice ?? plan.targetPrice}`);
  }
  if (entry.authorizedRiskAmount !== undefined) {
    lines.push(`authorized_risk:${entry.authorizedRiskAmount} ${entry.currency ?? "USD"}`);
  }
  if (entry.commonStopPrice !== undefined || plan.stopPrice !== undefined) {
    lines.push(`common_stop:${entry.commonStopPrice ?? plan.stopPrice}`);
  }
  if (entry.proposalSource) {
    lines.push(
      `proposed_by:human=${entry.proposalSource.human} ai=${entry.proposalSource.ai} human_validated=${entry.proposalSource.validatedByHuman}`
    );
  }
  for (const [i, limit] of entry.limits.entries()) {
    const filled = limit.filled ? "yes" : "no";
    const d = limit.derived;
    lines.push(
      `limit_${i + 1}:${limit.price} alloc:${limit.allocationPercent}% role:${limit.role ?? ""} stop:${limit.stopPrice ?? entry.commonStopPrice ?? plan.stopPrice ?? ""} rr:${d?.rr ?? ""} risk$:${d?.plannedRiskAmount ?? ""} qty:${d?.plannedQuantity ?? ""} filled:${filled}`
    );
  }
  if (entry.averageEntry !== undefined) lines.push(`average_entry:${entry.averageEntry}`);
  if (entry.fillPercent !== undefined) lines.push(`fill_percent:${entry.fillPercent}`);
  if (entry.blendedRR !== undefined) lines.push(`blended_rr:${entry.blendedRR}`);
  if (entry.combinedRR !== undefined) lines.push(`combined_rr:${entry.combinedRR}`);
  if (entry.riskUsedAmount !== undefined) lines.push(`risk_used:${entry.riskUsedAmount}`);
  if (entry.entryImprovementVsFirst !== undefined) {
    lines.push(`entry_improvement_vs_first:${entry.entryImprovementVsFirst}`);
  }
  return lines.join("\n");
}
