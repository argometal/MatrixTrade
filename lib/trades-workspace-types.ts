export interface TradesWorkspaceRow {
  id: string;
  ticker: string;
  direction: string;
  playbook: string;
  entry: number;
  stop: number;
  target: number | null;
  status: "pending" | "open" | "closed";
  pnl: number | null;
  rMultiple: number | null;
  date: string;
  reviewed: boolean;
}

export interface TradesWorkspaceData {
  cycleLabel: string;
  tradesMax: number;
  rows: TradesWorkspaceRow[];
  counts: { open: number; pending: number; closed: number; all: number };
  openSummary: {
    positions: Array<{ id: string; ticker: string; direction: string; risk: number | null }>;
    totalRisk: number;
    count: number;
  };
  insights: {
    bestTrade: { id: string; ticker: string; pnl: number } | null;
    worstTrade: { id: string; ticker: string; pnl: number } | null;
    highestR: { id: string; ticker: string; r: number } | null;
    winRate: number | null;
    expectancy: number | null;
    avgR: number | null;
    bestPlaybook: { name: string; pnl: number } | null;
  };
  recentClosed: Array<{
    id: string;
    ticker: string;
    pnl: number;
    date: string;
  }>;
  playbooks: Array<{ id: string; name: string }>;
  suggestedTradeId: string;
  pendingInboxCount: number;
}

export function formatTradeUsd(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}
