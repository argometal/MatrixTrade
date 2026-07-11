import type { PlaybookStats } from "./analytics";
import type { AttentionItem } from "./dashboard-attention";
import type { EquityPoint, MistakeStat } from "./review";
import type { Experiment } from "./types";
import type { MonthlyRisk } from "./monthly-risk";

export type DashboardData = {
  experiment: Experiment;
  monthly: MonthlyRisk;
  cycleLabel: string;
  openTrades: number;
  pendingReviews: number;
  activePlaybooks: number;
  testingPlaybooks: number;
  activePlans: number;
  plansNeedingReview: number;
  attentionItems: AttentionItem[];
  mistakeStats: MistakeStat[];
  equityPoints: EquityPoint[];
  winRate: number;
  profitFactor: number | null;
  expectancy: number | null;
  avgR: number | null;
  bestPlaybook: PlaybookStats | null;
  worstPlaybook: PlaybookStats | null;
};
