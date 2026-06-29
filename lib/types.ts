export type TradeStatus = "pending" | "open" | "closed";

export interface Trade {
  id: string;
  ticker: string;

  entry: number;
  exit?: number;
  stop: number;
  target?: number;

  shares: number;

  status: TradeStatus;

  obsidianNote: string;

  createdAt: string;
  closedAt?: string;

  /** Absolute path to the note file on disk */
  filePath: string;
}

export interface ExperimentRules {
  cycleLossLimit: number;
  maxTrades: number;
  /** Vault name as shown in Obsidian (used in obsidian:// links) */
  obsidianVault: string;
  /** Folder path on disk — absolute or relative to the app root */
  obsidianVaultPath: string;
  /** Subfolder inside the vault where trade notes live */
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
}

export interface CloseTradeInput {
  exit: number;
}

/** Fields the app owns — never edit these manually in Obsidian */
export const MANAGED_FIELDS = [
  "id",
  "ticker",
  "entry",
  "exit",
  "stop",
  "target",
  "shares",
  "status",
  "createdAt",
  "closedAt",
  "matrixtrade",
  "mtVersion",
] as const;
