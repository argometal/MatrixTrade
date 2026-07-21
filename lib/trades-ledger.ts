/**
 * Trades ledger — histórico filtrable (veredictos).
 * Incomplete hypotheses stay in data as `incomplete` (Scout war room).
 */

import { calculateTradeResult } from "./calculate";
import type { TradePlan } from "./plan-types";
import { isTradeReviewed } from "./review";
import type { Trade } from "./types";

export type LedgerVerdict =
  | "completed_win"
  | "completed_loss"
  | "late_entry_miss"
  | "never_executed"
  | "incomplete";

export const LEDGER_VERDICT_LABELS: Record<LedgerVerdict, string> = {
  completed_win: "Completado con éxito",
  completed_loss: "Completado perdido",
  late_entry_miss: "Perdido por entrada tardía",
  never_executed: "Jamás se ejecutó",
  incomplete: "Sin veredicto",
};

export type LedgerRow = {
  id: string;
  kind: "trade" | "plan";
  ticker: string;
  verdict: LedgerVerdict;
  label: string;
  href: string;
  date: string;
  pnl: number | null;
  detail?: string;
};

function isLateEntryMiss(plan: TradePlan): boolean {
  const reason = plan.outcome?.reason;
  const factors = plan.outcome?.externalFactors ?? [];
  if (reason === "no_trigger") return true;
  if (factors.some((f) => f.toLowerCase() === "timing")) return true;
  return false;
}

function planVerdict(plan: TradePlan): LedgerVerdict {
  if (plan.status === "watching" || plan.status === "ready" || plan.status === "entered") {
    return "incomplete";
  }
  if (isLateEntryMiss(plan)) return "late_entry_miss";
  if (plan.status === "skipped" || plan.status === "expired" || plan.status === "failed") {
    return "never_executed";
  }
  return "incomplete";
}

function tradeVerdict(trade: Trade): LedgerVerdict {
  if (trade.status !== "closed") return "incomplete";
  const pnl = calculateTradeResult(trade);
  if (pnl === null) return "incomplete";
  return pnl >= 0 ? "completed_win" : "completed_loss";
}

export function buildTradesLedger(trades: Trade[], plans: TradePlan[]): LedgerRow[] {
  const rows: LedgerRow[] = [];
  const linkedTradeIds = new Set(
    plans.map((p) => p.linkedTradeId).filter(Boolean) as string[]
  );

  for (const trade of trades) {
    const pnl = trade.status === "closed" ? calculateTradeResult(trade) : null;
    const verdict = tradeVerdict(trade);
    rows.push({
      id: trade.id,
      kind: "trade",
      ticker: trade.ticker,
      verdict,
      label: `${trade.ticker} · ${trade.id}`,
      href: `/trades/${trade.id}`,
      date:
        trade.closedAt?.slice(0, 10) ??
        trade.openedAt?.slice(0, 10) ??
        trade.createdAt.slice(0, 10),
      pnl,
      detail:
        trade.status === "closed" && !isTradeReviewed(trade)
          ? "Review pendiente"
          : trade.status,
    });
  }

  for (const plan of plans) {
    if (plan.linkedTradeId && trades.some((t) => t.id === plan.linkedTradeId)) {
      continue;
    }
    // Also skip if a trade already references this plan
    if (trades.some((t) => t.planId === plan.id)) continue;

    const verdict = planVerdict(plan);
    rows.push({
      id: plan.id,
      kind: "plan",
      ticker: plan.ticker,
      verdict,
      label: `${plan.ticker} · ${plan.id}`,
      href: `/planning?plan=${plan.id}`,
      date: plan.updatedAt?.slice(0, 10) ?? plan.createdAt.slice(0, 10),
      pnl: null,
      detail: plan.outcome?.lesson ?? plan.status,
    });
  }

  void linkedTradeIds;

  return rows.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

export function filterLedgerRows(
  rows: LedgerRow[],
  filter: LedgerVerdict | "all" | "historico"
): LedgerRow[] {
  if (filter === "all") return rows;
  if (filter === "historico") return rows.filter((r) => r.verdict !== "incomplete");
  return rows.filter((r) => r.verdict === filter);
}

export function countLedgerByVerdict(rows: LedgerRow[]): Record<LedgerVerdict, number> {
  const counts: Record<LedgerVerdict, number> = {
    completed_win: 0,
    completed_loss: 0,
    late_entry_miss: 0,
    never_executed: 0,
    incomplete: 0,
  };
  for (const row of rows) counts[row.verdict] += 1;
  return counts;
}
