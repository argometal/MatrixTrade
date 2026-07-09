export interface TradeProposalFields {
  id: string;
  ticker: string;
  entry: number;
  stop: number;
  shares: number;
  target?: number;
  thesis?: string;
  playbookId?: string;
  direction?: "long" | "short";
}

export function buildTradeProposalBlock(fields: TradeProposalFields): string {
  const proposal: Record<string, unknown> = {
    id: fields.id.trim().toUpperCase(),
    ticker: fields.ticker.trim().toUpperCase(),
    entry: fields.entry,
    stop: fields.stop,
    shares: fields.shares,
  };
  if (fields.target !== undefined && !Number.isNaN(fields.target)) {
    proposal.target = fields.target;
  }
  if (fields.thesis?.trim()) proposal.thesis = fields.thesis.trim();
  if (fields.playbookId?.trim()) proposal.playbookId = fields.playbookId.trim();
  if (fields.direction) proposal.direction = fields.direction;

  return JSON.stringify(
    {
      type: "trade-proposal",
      source: "trades-workspace",
      proposal,
    },
    null,
    2
  );
}

export function proposalStopPct(entry: number, stop: number): string {
  if (entry <= 0) return "—";
  const pct = ((stop - entry) / entry) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

export function proposalTargetPct(entry: number, target: number): string {
  if (entry <= 0) return "—";
  const pct = ((target - entry) / entry) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

export function proposalRMultiple(entry: number, stop: number, target?: number): string {
  const risk = Math.abs(entry - stop);
  if (risk <= 0 || target === undefined) return "—";
  const reward = Math.abs(target - entry);
  return `${(reward / risk).toFixed(2)}R`;
}
