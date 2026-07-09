import {
  isMonthlyCapBreached,
  sumTickerRealizedPnL,
  type MonthlyRisk,
  wouldExceedMonthlyCap,
  wouldExceedTickerCap,
} from "./monthly-risk";
import type { CloseTradeInput, CreateTradeInput, ExperimentRules, Trade } from "./types";

export type ValidationError = { field: string; message: string };

const VALID_ID_PATTERN = /^H(0(?:0[1-9]|[12][0-9]|30))$/;

export function isValidExperimentId(id: string): boolean {
  return VALID_ID_PATTERN.test(id);
}

export function validateCreateTrade(
  input: CreateTradeInput,
  existingTrades: Trade[],
  rules: ExperimentRules,
  monthly: MonthlyRisk
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!isValidExperimentId(input.id)) {
    errors.push({
      field: "id",
      message: "ID must be H001 through H030 only.",
    });
  }

  if (existingTrades.some((t) => t.id === input.id)) {
    errors.push({
      field: "id",
      message: `Trade ${input.id} already exists.`,
    });
  }

  if (existingTrades.length >= rules.maxTrades) {
    errors.push({
      field: "id",
      message: `Maximum ${rules.maxTrades} trades allowed in this cycle.`,
    });
  }

  if (isMonthlyCapBreached(monthly.monthlyRealizedPnL, monthly.effectiveLossCap)) {
    errors.push({
      field: "monthly",
      message: `Monthly loss cap reached ($${Math.abs(monthly.effectiveLossCap).toFixed(2)} including $${monthly.carryoverIn.toFixed(2)} carryover).`,
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
      monthly.monthlyRealizedPnL,
      result,
      monthly.effectiveLossCap
    )
  ) {
    errors.push({
      field: "monthly",
      message: `Closing at this exit would exceed the monthly cap ($${Math.abs(monthly.effectiveLossCap).toFixed(2)}).`,
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
