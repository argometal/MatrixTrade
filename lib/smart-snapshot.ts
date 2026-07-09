import { computeAllPlaybookStats, computeWinRate } from "./analytics";
import type { AiNote } from "./ai-notes-types";
import type { Playbook } from "./playbook-types";
import { getUnreviewedTrades } from "./review";
import {
  formatPlaybookSection,
  formatPriorAiNotesSection,
  formatTradeSection,
} from "./sectioned-snapshot";
import { selectSnapshotTrades, type SnapshotOptions } from "./snapshot";
import type { MonthlyRisk } from "./monthly-risk";
import type { Experiment, Trade } from "./types";

const RECENT_CLOSED_LIMIT = 5;
const MAX_FOCUS_REVIEWS = 5;
const MAX_FOCUS_TICKERS = 5;
const MAX_FOCUS_PLAYBOOKS = 3;
const MAX_RELEVANT_NOTES = 15;

function formatOverviewSection(
  experiment: Experiment,
  monthly: MonthlyRisk,
  trades: Trade[],
  openCount: number,
  pendingCount: number,
  pendingReviewCount: number,
  recentClosedCount: number
): string {
  const winRate = computeWinRate(trades);
  const lines = [
    "=== OVERVIEW ===",
    `month:${monthly.monthKey}`,
    `monthly_base:${formatSigned(monthly.monthlyLossLimit)}`,
    `carryover_in:${monthly.carryoverIn.toFixed(2)}`,
    `monthly_effective_cap:${formatSigned(monthly.effectiveLossCap)}`,
    `monthly_pnl:${formatSigned(monthly.monthlyRealizedPnL)}`,
    `monthly_room:${monthly.monthlyLossRoom.toFixed(2)}`,
    `experiment_net_pnl:${formatSigned(experiment.realizedPnL)}`,
    `experiment_gross_loss:${formatSigned(experiment.grossLoss)}`,
    `closed:${experiment.closedTrades}/${experiment.maxTrades}`,
    `wins:${experiment.wins}`,
    `losses:${experiment.losses}`,
    `winrate:${winRate !== null ? Math.round(winRate * 100) : 0}%`,
    `open_trades:${openCount}`,
    `pending_orders:${pendingCount}`,
    `pending_reviews:${pendingReviewCount}`,
    `recent_closed_shown:${recentClosedCount}`,
  ];
  return lines.join("\n");
}

function formatSigned(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(2)}`;
}

export function selectRelevantAiNotes(
  notes: AiNote[],
  trades: Trade[],
  recentClosed: Trade[],
  limit = MAX_RELEVANT_NOTES
): AiNote[] {
  const relevantIds = new Set<string>();
  for (const trade of trades) {
    if (trade.status === "open" || trade.status === "pending") {
      relevantIds.add(trade.id);
    }
    if (trade.status === "closed" && !trade.reviewedAt) {
      relevantIds.add(trade.id);
    }
  }
  for (const trade of recentClosed) {
    relevantIds.add(trade.id);
  }

  const linked = notes.filter((note) => note.tradeId && relevantIds.has(note.tradeId));
  const general = notes.filter((note) => !note.tradeId);
  const seen = new Set<string>();
  const merged: AiNote[] = [];

  for (const note of [...linked, ...general]) {
    if (seen.has(note.id)) continue;
    seen.add(note.id);
    merged.push(note);
    if (merged.length >= limit) break;
  }

  return merged;
}

export function buildNextFocusSuggestions(trades: Trade[], playbooks: Playbook[]): string[] {
  const suggestions: string[] = [];

  for (const trade of getUnreviewedTrades(trades).slice(0, MAX_FOCUS_REVIEWS)) {
    suggestions.push(`review:${trade.id}`);
  }

  const openTickers = [
    ...new Set(
      trades
        .filter((t) => t.status === "open")
        .map((t) => t.ticker.trim().toUpperCase())
        .filter(Boolean)
    ),
  ].sort();
  for (const ticker of openTickers.slice(0, MAX_FOCUS_TICKERS)) {
    suggestions.push(`ticker:${ticker}`);
  }

  const stats = computeAllPlaybookStats(playbooks, trades).filter((row) => row.tradeCount > 0);
  const statusRank = (status: Playbook["status"] | undefined): number => {
    if (status === "TESTING") return 0;
    if (status === "ACTIVE") return 1;
    return 2;
  };
  const rankedPlaybooks = [...stats].sort((a, b) => {
    const byStatus = statusRank(a.playbook?.status) - statusRank(b.playbook?.status);
    if (byStatus !== 0) return byStatus;
    return b.tradeCount - a.tradeCount;
  });
  for (const row of rankedPlaybooks.slice(0, MAX_FOCUS_PLAYBOOKS)) {
    suggestions.push(`playbook:${row.playbook?.name ?? "Unassigned"}`);
  }

  return suggestions;
}

function formatNextFocusSection(suggestions: string[]): string {
  if (suggestions.length === 0) {
    return "=== NEXT FOCUS SUGGESTIONS ===\nnext_focus_suggestions:\n(none)";
  }
  const lines = suggestions.map((item) => `- ${item}`);
  return [
    "=== NEXT FOCUS SUGGESTIONS ===",
    "If deeper context is needed, ask the user for ONE focused follow-up using a single item below.",
    "next_focus_suggestions:",
    ...lines,
  ].join("\n");
}

function formatRelevantAiNotesSection(notes: AiNote[]): string {
  if (notes.length === 0) return "=== AI NOTES (RELEVANT) ===\n(none)";
  return formatPriorAiNotesSection(notes).replace(
    "=== AI NOTES (PRIOR) ===",
    "=== AI NOTES (RELEVANT) ==="
  );
}

export interface SmartSnapshotInput {
  experiment: Experiment;
  monthly: MonthlyRisk;
  trades: Trade[];
  setups?: import("./setup-types").Setup[];
  playbooks?: Playbook[];
  snapshotRevision?: number | null;
  priorAiNotes?: AiNote[];
  options?: SnapshotOptions;
  requestText?: string;
}

export function buildSmartSnapshot(input: SmartSnapshotInput): string {
  const {
    experiment,
    monthly,
    trades,
    setups = [],
    playbooks = [],
    snapshotRevision,
    priorAiNotes = [],
    options = {},
    requestText,
  } = input;

  const { open, pending } = selectSnapshotTrades(trades, options);
  const unreviewedClosed = getUnreviewedTrades(trades);

  const recentClosed = trades
    .filter((t) => t.status === "closed")
    .sort((a, b) => (b.closedAt ?? b.createdAt).localeCompare(a.closedAt ?? a.createdAt))
    .slice(0, RECENT_CLOSED_LIMIT)
    .sort((a, b) => a.id.localeCompare(b.id));

  const relevantNotes = selectRelevantAiNotes(priorAiNotes, trades, recentClosed);
  const focusSuggestions = buildNextFocusSuggestions(trades, playbooks);

  const generated = new Date().toISOString();
  const revision = snapshotRevision ?? 0;

  const sections = [
    "=== MATRIX ===",
    "version:1",
    `generated:${generated}`,
    `revision:${revision}`,
    "",
    formatOverviewSection(
      experiment,
      monthly,
      trades,
      open.length,
      pending.length,
      unreviewedClosed.length,
      recentClosed.length
    ),
    "",
    formatTradeSection("=== OPEN TRADES ===", open, setups),
    "",
    formatTradeSection("=== RECENT CLOSED ===", recentClosed, setups),
    "",
    formatTradeSection("=== PENDING REVIEWS ===", unreviewedClosed, setups),
    "",
    formatPlaybookSection(playbooks, trades).replace("=== PLAYBOOK ===", "=== PLAYBOOK SUMMARY ==="),
    "",
    formatRelevantAiNotesSection(relevantNotes),
    "",
    formatNextFocusSection(focusSuggestions),
  ];

  if (requestText?.trim()) {
    sections.push("", "=== REQUEST ===", requestText.trim());
  }

  return sections.join("\n");
}
