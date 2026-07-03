export type TradeStatus = "pending" | "open" | "closed";

export type MistakeType =
  | "fomo"
  | "chased"
  | "oversized"
  | "ignored_stop"
  | "ignored_htf"
  | "revenge"
  | "none";

export interface Trade {
  id: string;
  ticker: string;
  entry: number;
  exit?: number;
  stop: number;
  target?: number;
  shares: number;
  status: TradeStatus;
  createdAt: string;
  closedAt?: string;
  /** Playbook reference — data/setups.json */
  setupId?: string;
  /** Post-close review metadata */
  mistakes?: MistakeType[];
  qualityEntry?: number;
  qualityExit?: number;
  qualityMgmt?: number;
  reviewedAt?: string;
  lesson?: string;
  actionItem?: string;
  /** Qualitative — user or ChatGPT via import */
  thesis?: string;
  psychology?: string;
  lessons?: string;
  notes?: string;
  /** Set when loaded — Obsidian deep link */
  obsidianNote?: string;
  /** Set when loaded — e.g. vault/Trades/H001-AMZN.md */
  notePath?: string;
  inconsistent?: boolean;
}

export interface SaveReviewInput {
  mistakes: MistakeType[];
  qualityEntry: number;
  qualityExit: number;
  qualityMgmt: number;
  lesson?: string;
  actionItem?: string;
}

export interface ExperimentRules {
  cycleLossLimit: number;
  maxTrades: number;
  obsidianVault: string;
  obsidianVaultPath: string;
  tradesFolder: string;
}

export interface Experiment {
  cycleLossLimit: number;
  realizedPnL: number;
  remainingLossBudget: number;
  maxTrades: number;
  closedTrades: number;
  wins: number;
  losses: number;
}

export interface CreateTradeInput {
  id: string;
  ticker: string;
  entry: number;
  stop: number;
  shares: number;
  target?: number;
  setupId?: string;
  status?: TradeStatus;
  thesis?: string;
  psychology?: string;
  lessons?: string;
  notes?: string;
}

export interface UpdateTradeInput {
  ticker?: string;
  entry?: number;
  exit?: number;
  stop?: number;
  target?: number;
  shares?: number;
  status?: TradeStatus;
  thesis?: string;
  psychology?: string;
  lessons?: string;
  notes?: string;
}

export interface CloseTradeInput {
  exit: number;
}

export interface TradesExport {
  version: 1;
  exportedAt: string;
  rules: ExperimentRules;
  trades: Trade[];
}
