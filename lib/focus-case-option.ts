import type { InsightsCaseRow } from "./insights-case-spine-types";

export type FocusCaseVisibleState = "WATCHING" | "FAILED" | "SUCCESS";

export type FocusCaseOption = {
  value: string;
  label: string;
  visibleState: FocusCaseVisibleState | null;
};

export function deriveFocusCaseVisibleState(input: {
  row: InsightsCaseRow;
  planStatus?: string | null;
}): FocusCaseVisibleState | null {
  const { row, planStatus } = input;
  if (row.caseOrigin === "historical_trade") return null;
  if (typeof row.realizedPnL === "number" && Number.isFinite(row.realizedPnL)) {
    if (row.realizedPnL > 0) return "SUCCESS";
    if (row.realizedPnL < 0) return "FAILED";
  }
  if (planStatus === "watching") return "WATCHING";
  if (planStatus === "failed") return "FAILED";
  if (
    row.outcomeLabel === "executed_loss" ||
    row.outcomeLabel === "unexecuted_plan_loss" ||
    row.outcomeLabel === "missed_opportunity"
  ) {
    return "FAILED";
  }
  return null;
}

export function buildFocusCaseOption(input: {
  row: InsightsCaseRow;
  planStatus?: string | null;
}): FocusCaseOption | null {
  const { row, planStatus } = input;
  if (row.caseOrigin === "historical_trade") return null;
  const visibleState = deriveFocusCaseVisibleState({ row, planStatus });
  const parts = [row.ticker, row.planId, row.lifecycle.status];
  if (visibleState) parts.push(visibleState);
  return {
    value: row.planId,
    label: parts.join(" · "),
    visibleState,
  };
}
