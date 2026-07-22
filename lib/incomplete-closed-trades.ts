import { assessTradeLegacy } from "./trade-forensic-snapshot";
import { isTradeReviewed } from "./review";
import type { Trade } from "./types";

/**
 * Closed ≠ complete. A closed fill still needs review and/or missing learning fields
 * before it leaves the incomplete queue (Trades alert — not Scout war room).
 */

export type IncompleteClosedGap =
  | "needs_review"
  | "missing_playbook"
  | "missing_plan"
  | "missing_thesis"
  | "missing_planned_rr"
  | "missing_loss_classification"
  | "missing_post_stop_study";

export type IncompleteClosedTrade = {
  trade: Trade;
  gaps: IncompleteClosedGap[];
};

const GAP_LABELS: Record<IncompleteClosedGap, string> = {
  needs_review: "review pending",
  missing_playbook: "playbook",
  missing_plan: "scout PLAN link",
  missing_thesis: "thesis at entry",
  missing_planned_rr: "planned R",
  missing_loss_classification: "loss classification",
  missing_post_stop_study: "post-stop study",
};

export function incompleteClosedGapLabel(gap: IncompleteClosedGap): string {
  return GAP_LABELS[gap];
}

export function classifyIncompleteClosedTrade(trade: Trade): IncompleteClosedGap[] {
  if (trade.status !== "closed") return [];

  const gaps: IncompleteClosedGap[] = [];
  if (!isTradeReviewed(trade)) gaps.push("needs_review");

  const legacy = assessTradeLegacy(trade);
  for (const field of legacy.missing) {
    if (field.startsWith("playbookId")) gaps.push("missing_playbook");
    else if (field.startsWith("planId")) gaps.push("missing_plan");
    else if (field.startsWith("thesis")) gaps.push("missing_thesis");
    else if (field.startsWith("riskRewardPlanned")) gaps.push("missing_planned_rr");
    else if (field.startsWith("lossClassification")) gaps.push("missing_loss_classification");
    else if (field.startsWith("postStopStudy")) gaps.push("missing_post_stop_study");
  }

  return [...new Set(gaps)];
}

export function listIncompleteClosedTrades(trades: Trade[]): IncompleteClosedTrade[] {
  return trades
    .filter((t) => t.status === "closed")
    .map((trade) => ({ trade, gaps: classifyIncompleteClosedTrade(trade) }))
    .filter((row) => row.gaps.length > 0)
    .sort((a, b) =>
      (b.trade.closedAt ?? b.trade.createdAt).localeCompare(a.trade.closedAt ?? a.trade.createdAt)
    );
}

export function formatIncompleteClosedSummary(row: IncompleteClosedTrade): string {
  return row.gaps.map(incompleteClosedGapLabel).join(" · ");
}

export function incompleteClosedHref(row: IncompleteClosedTrade): string {
  if (row.gaps.includes("needs_review")) {
    return `/trades/${row.trade.id}/review`;
  }
  return `/trades/${row.trade.id}`;
}
