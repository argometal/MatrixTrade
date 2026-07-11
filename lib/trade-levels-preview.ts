import {
  proposalRMultiple,
  proposalStopPct,
  proposalTargetPct,
} from "./build-trade-proposal-block";

export interface TradeLevelRow {
  label: string;
  value: string;
  detail?: string;
  emphasis?: "primary" | "danger" | "success" | "muted";
}

export interface TradeLevelsView {
  ticker: string;
  tradeId: string;
  direction?: string;
  rows: TradeLevelRow[];
  plannedRR?: number;
}

export function buildTradeLevelsView(
  proposal: Record<string, unknown>
): TradeLevelsView | null {
  const entry = Number(proposal.entry);
  const stop = Number(proposal.stop);
  const shares = Number(proposal.shares);
  const ticker = String(proposal.ticker ?? "").trim();
  const tradeId = String(proposal.id ?? "").trim();

  if (!ticker || !tradeId || !Number.isFinite(entry) || !Number.isFinite(stop) || !Number.isFinite(shares)) {
    return null;
  }

  const target =
    proposal.target !== undefined && proposal.target !== null
      ? Number(proposal.target)
      : undefined;
  const direction =
    proposal.direction === "short" || proposal.direction === "long"
      ? String(proposal.direction)
      : undefined;

  const rows: TradeLevelRow[] = [];

  if (target !== undefined && Number.isFinite(target)) {
    rows.push({
      label: "Target",
      value: `$${target.toFixed(2)}`,
      detail: proposalTargetPct(entry, target),
      emphasis: "success",
    });
  }

  rows.push({
    label: "Entry",
    value: `$${entry.toFixed(2)}`,
    emphasis: "primary",
  });

  rows.push({
    label: "Stop",
    value: `$${stop.toFixed(2)}`,
    detail: proposalStopPct(entry, stop),
    emphasis: "danger",
  });

  rows.push({
    label: "Shares",
    value: String(shares),
    emphasis: "muted",
  });

  const rrRaw = target !== undefined ? proposalRMultiple(entry, stop, target) : "—";
  const plannedRR = rrRaw !== "—" ? Number.parseFloat(rrRaw) : undefined;

  return {
    ticker,
    tradeId,
    direction,
    rows,
    plannedRR: Number.isFinite(plannedRR) ? plannedRR : undefined,
  };
}
