import type { AttentionItem } from "./dashboard-attention";
import type { LearningOutcome } from "./learning-outcome-types";
import type { ObservationRecord } from "./observation-types";
import type { Trade } from "./types";

/** Derived attention for Observation + MAF attribution gaps. */
export function buildLearningAttentionItems(
  trades: Trade[],
  observations: ObservationRecord[],
  learningOutcomes: LearningOutcome[]
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const obsByTrade = new Set(
    observations
      .map((o) => o.tradeId?.toUpperCase())
      .filter(Boolean) as string[]
  );

  for (const trade of trades.filter((t) => t.status === "closed")) {
    if (obsByTrade.has(trade.id.toUpperCase())) continue;
    items.push({
      id: `observation-${trade.id}`,
      label: `Observation missing · ${trade.id} ${trade.ticker}`,
      href: `/trades/${trade.id}`,
      priority: 2,
    });
  }

  for (const lo of learningOutcomes) {
    if (lo.lifecycleStatus !== "ready_for_attribution") continue;
    if (lo.mafExperimentId) continue;
    const key = lo.tradeId ?? lo.id;
    items.push({
      id: `attribution-${key}`,
      label: `Attribution ready · ${lo.id}${lo.ticker ? ` · ${lo.ticker}` : ""}`,
      href: lo.tradeId ? `/trades/${lo.tradeId}` : lo.planId ? `/planning?plan=${lo.planId}` : "/trades",
      priority: 2,
    });
  }

  return items;
}
