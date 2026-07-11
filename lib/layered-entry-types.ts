/** Layered limit entry — entry optimization, not thesis change or scaling after confirmation. */

export type LayeredEntryStatus =
  | "planned"
  | "partial"
  | "full"
  | "missed"
  | "active"
  | "cancelled";

export interface LayeredEntryLimit {
  price: number;
  /** Percent of total capital for this limit (all limits should sum to 100). */
  allocationPercent: number;
}

export interface LayeredEntryPlan {
  /** e.g. layered_limits — one execution variable per experiment. */
  executionMethod: "single_limit" | "layered_limits" | "market";
  limits: LayeredEntryLimit[];
  /** Hard rule — if all limits miss, trade is over. No market chase. */
  noChase: true;
  status: LayeredEntryStatus;
  /** Weighted average fill price when any limit executes. */
  averageEntry?: number;
  /** Percent of planned capital filled (0–100). */
  fillPercent?: number;
  /** First limit price — baseline for entry improvement metric. */
  firstLimitPrice?: number;
  /** Average improvement vs first limit (positive = better entry). */
  entryImprovementVsFirst?: number;
}

export const LAYERED_ENTRY_STATUS_LABELS: Record<LayeredEntryStatus, string> = {
  planned: "Planned",
  partial: "Partial fill",
  full: "Full fill",
  missed: "Missed — no chase",
  active: "Active",
  cancelled: "Cancelled",
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
}): string {
  const entry = plan.layeredEntry;
  if (!entry) return "";
  const lines = [
    "=== LAYERED ENTRY ===",
    `method:${entry.executionMethod}`,
    `status:${entry.status}`,
    `no_chase:yes`,
  ];
  for (const [i, limit] of entry.limits.entries()) {
    lines.push(`limit_${i + 1}:${limit.price} alloc:${limit.allocationPercent}%`);
  }
  if (entry.averageEntry !== undefined) lines.push(`average_entry:${entry.averageEntry}`);
  if (entry.fillPercent !== undefined) lines.push(`fill_percent:${entry.fillPercent}`);
  if (entry.entryImprovementVsFirst !== undefined) {
    lines.push(`entry_improvement_vs_first:${entry.entryImprovementVsFirst}`);
  }
  return lines.join("\n");
}
