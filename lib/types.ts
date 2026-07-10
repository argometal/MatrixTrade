export type TradeStatus = "pending" | "open" | "closed";

export type MistakeType =
  | "fomo"
  | "chased"
  | "oversized"
  | "ignored_stop"
  | "ignored_htf"
  | "revenge"
  | "none";

export type TradeDirection = "long" | "short";

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
  /** Legacy setup tag — data/setups.json */
  setupId?: string;
  /** Playbook lab — data/playbooks.json */
  playbookId?: string;
  /** Free-text setup note (optional) */
  setup?: string;
  direction?: TradeDirection;
  plannedRisk?: number;
  actualRisk?: number;
  riskRewardPlanned?: number;
  riskRewardActual?: number;
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
  /** Max loss allowed per calendar month before carryover (negative USD). */
  monthlyLossLimit: number;
  /** Roll unused prior-month budget into this month's allowance. */
  carryoverEnabled?: boolean;
  /** Max cumulative loss per ticker across all trades (negative USD). */
  maxLossPerTicker: number;
  obsidianVault: string;
  obsidianVaultPath: string;
  tradesFolder: string;
  /** @deprecated Use monthlyLossLimit. Kept for rules.json migration only. */
  cycleLossLimit?: number;
}

export interface Experiment {
  /** Net realized P/L — sum of every closed trade result in the experiment. */
  realizedPnL: number;
  /** Sum of all losing trade results only (negative or zero). */
  grossLoss: number;
  closedTrades: number;
  wins: number;
  losses: number;
}

export interface TradeMetaInput {
  playbookId?: string;
  setup?: string;
  direction?: TradeDirection;
  plannedRisk?: number;
  actualRisk?: number;
  riskRewardPlanned?: number;
  riskRewardActual?: number;
  setupId?: string;
  /** ISO timestamp — drives monthly risk bucketing for closed trades. */
  closedAt?: string;
}

export interface CreateTradeInput {
  id: string;
  ticker: string;
  entry: number;
  stop: number;
  shares: number;
  target?: number;
  setupId?: string;
  playbookId?: string;
  setup?: string;
  direction?: TradeDirection;
  plannedRisk?: number;
  actualRisk?: number;
  riskRewardPlanned?: number;
  riskRewardActual?: number;
  status?: TradeStatus;
  thesis?: string;
  psychology?: string;
  lessons?: string;
  notes?: string;
}

export interface UpdateTradeInput extends TradeMetaInput {
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
  closedAt?: string;
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
