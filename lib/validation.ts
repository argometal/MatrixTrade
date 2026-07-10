import {
  isMonthlyCapBreached,
  sumTickerRealizedPnL,
  type MonthlyRisk,
  wouldExceedMonthlyCap,
  wouldExceedTickerCap,
} from "./monthly-risk";
import type { CloseTradeInput, CreateTradeInput, ExperimentRules, Trade } from "./types";

export type ValidationError = { field: string; message: string };

/** H-prefix trade ids — no fixed upper bound (H001, H031, H999999). */
const VALID_ID_PATTERN = /^H[0-9]{1,8}$/i;

export function isValidExperimentId(id: string): boolean {
  return VALID_ID_PATTERN.test(id.trim());
}

export function validateCreateTrade(
  input: CreateTradeInput,
  existingTrades: Trade[],
  rules: ExperimentRules,
  monthly: MonthlyRisk
): ValidationError[] {
  const errors: ValidationError[] = [];
  const id = input.id?.trim().toUpperCase();

  if (!id || !isValidExperimentId(id)) {
    errors.push({
      field: "id",
      message: "ID must be H followed by digits (e.g. H001, H031).",
    });
  }

  if (existingTrades.some((t) => t.id === id)) {
    errors.push({
      field: "id",
      message: `Trade ${id} already exists.`,
    });
  }

  if (isMonthlyCapBreached(monthly.lossUsedThisMonth, monthly.monthlyAllowance)) {
    errors.push({
      field: "monthly",
      message: `Monthly loss cap reached ($${monthly.monthlyAllowance.toFixed(2)} including $${monthly.carryoverIn.toFixed(2)} carryover).`,
    });
  }

  const ticker = input.ticker?.trim().toUpperCase();
  if (ticker) {
    const tickerPnL = sumTickerRealizedPnL(existingTrades, ticker);
    if (tickerPnL <= rules.maxLossPerTicker) {
      errors.push({
        field: "ticker",
        message: `${ticker} already hit the per-stock loss limit (${rules.maxLossPerTicker} USD).`,
      });
    }
  }

  if (!input.ticker?.trim()) {
    errors.push({ field: "ticker", message: "Ticker is required." });
  }

  if (input.entry === undefined || input.entry <= 0) {
    errors.push({ field: "entry", message: "Entry must be a positive number." });
  }

  if (input.stop === undefined || input.stop <= 0) {
    errors.push({ field: "stop", message: "Stop must be a positive number." });
  }

  if (input.shares === undefined || input.shares <= 0 || !Number.isInteger(input.shares)) {
    errors.push({ field: "shares", message: "Shares must be a positive integer." });
  }

  if (input.entry > 0 && input.stop > 0 && input.entry <= input.stop) {
    errors.push({
      field: "stop",
      message: "For long trades, stop must be below entry.",
    });
  }

  return errors;
}

export function validateCloseTrade(
  trade: Trade | undefined,
  input: CloseTradeInput,
  rules: ExperimentRules,
  monthly: MonthlyRisk,
  allTrades: Trade[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!trade) {
    errors.push({ field: "id", message: "Trade not found." });
    return errors;
  }

  if (trade.status === "closed") {
    errors.push({ field: "status", message: "Trade is already closed." });
  }

  if (input.exit === undefined || input.exit <= 0) {
    errors.push({ field: "exit", message: "Exit price is required to close a trade." });
    return errors;
  }

  const result = (input.exit - trade.entry) * trade.shares;

  if (
    wouldExceedMonthlyCap(
      monthly.lossUsedThisMonth,
      result,
      monthly.monthlyAllowance
    )
  ) {
    errors.push({
      field: "monthly",
      message: `Closing at this exit would exceed the monthly cap ($${monthly.monthlyAllowance.toFixed(2)}).`,
    });
  }

  const tickerPnL = sumTickerRealizedPnL(allTrades, trade.ticker, trade.id);
  if (wouldExceedTickerCap(tickerPnL, result, rules.maxLossPerTicker)) {
    errors.push({
      field: "ticker",
      message: `Closing at this exit would exceed the ${trade.ticker} per-stock limit (${rules.maxLossPerTicker} USD).`,
    });
  }

  return errors;
}

export function validateStatusTransition(
  trade: Trade,
  nextStatus: Trade["status"],
  exit?: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (nextStatus === "closed" && (exit === undefined || exit <= 0)) {
    errors.push({
      field: "exit",
      message: "Cannot set status to closed without a valid exit price.",
    });
  }

  if (trade.status === "closed" && nextStatus !== "closed") {
    errors.push({
      field: "status",
      message: "Closed trades cannot be reopened.",
    });
  }

  return errors;
}
