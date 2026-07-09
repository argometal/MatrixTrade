import { calculateTradeResult } from "./calculate";
import { computeAllPlaybookStats, computeWinRate } from "./analytics";
import type { AiNote } from "./ai-notes-types";
import type { Playbook } from "./playbook-types";
import { getSetupName, type Setup } from "./setup-types";
import { selectSnapshotTrades, type SnapshotOptions } from "./snapshot";
import type { MonthlyRisk } from "./monthly-risk";
import type { Experiment, Trade } from "./types";

function formatSigned(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(2)}`;
}

function formatPrice(value: number): string {
  return value.toFixed(2);
}

function daysOpen(trade: Trade): number {
  const start = Date.parse(trade.createdAt);
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / 86_400_000));
}

function formatRiskAtStop(trade: Trade): string | null {
  const risk = (trade.entry - trade.stop) * trade.shares;
  if (!Number.isFinite(risk)) return null;
  return formatSigned(-Math.abs(risk));
}

export function formatCompactTrade(trade: Trade, setups: Setup[] = []): string {
  const lines: string[] = [trade.id];
  lines.push(`ticker:${trade.ticker}`);
  lines.push(`entry:${formatPrice(trade.entry)}`);
  lines.push(`stop:${formatPrice(trade.stop)}`);
  if (trade.target !== undefined) {
    lines.push(`target:${formatPrice(trade.target)}`);
  }
  if (trade.riskRewardPlanned !== undefined) {
    lines.push(`rr:${trade.riskRewardPlanned.toFixed(1)}`);
  }
  if (trade.thesis?.trim()) {
    lines.push(`thesis:${trade.thesis.trim().replace(/\n/g, " ")}`);
  }
  const setupName = getSetupName(setups, trade.setupId);
  if (setupName) lines.push(`setup:${setupName}`);

  if (trade.status === "open") {
    lines.push(`days_open:${daysOpen(trade)}`);
    const risk = formatRiskAtStop(trade);
    if (risk) lines.push(`risk_at_stop:${risk}`);
  }

  if (trade.status === "closed") {
    if (trade.exit !== undefined) lines.push(`exit:${formatPrice(trade.exit)}`);
    const pnl = calculateTradeResult(trade);
    if (pnl !== null) lines.push(`pnl:${formatSigned(pnl)}`);
    lines.push(`review:${trade.reviewedAt ? "done" : "pending"}`);
  }

  return lines.join("\n");
}

export function formatTradeSection(title: string, trades: Trade[], setups: Setup[]): string {
  if (trades.length === 0) return `${title}\n(none)`;
  return [title, trades.map((t) => formatCompactTrade(t, setups)).join("\n\n")].join("\n");
}

export function formatPlaybookSection(playbooks: Playbook[], trades: Trade[]): string {
  const stats = computeAllPlaybookStats(playbooks, trades).filter((row) => row.tradeCount > 0);
  if (stats.length === 0) return "=== PLAYBOOK ===\n(none)";

  const blocks = stats.map((row) => {
    const name = row.playbook?.name ?? "Unassigned";
    const status = row.playbook?.status ?? "—";
    const lines = [
      name,
      `status:${status}`,
      `winrate:${row.winRate !== null ? Math.round(row.winRate * 100) : 0}%`,
      `trades:${row.tradeCount}`,
      `closed:${row.closedCount}`,
      `net_pnl:${formatSigned(row.netPnL)}`,
    ];
    return lines.join("\n");
  });

  return ["=== PLAYBOOK ===", blocks.join("\n\n")].join("\n");
}

export function formatPriorAiNotesSection(notes: AiNote[]): string {
  if (notes.length === 0) return "=== AI NOTES (PRIOR) ===\n(none)";

  const blocks = notes.map((note) => {
    const tradePart = note.tradeId ? ` | ${note.tradeId}` : "";
    const header = `[rev:${note.snapshotRevision} | ${note.date.slice(0, 10)} | ${note.noteType}${tradePart}]`;
    const body = note.body.trim().replace(/\n{3,}/g, "\n\n");
    return `${header}\n${body}`;
  });

  return ["=== AI NOTES (PRIOR) ===", blocks.join("\n\n---\n\n")].join("\n");
}

export interface SectionedSnapshotInput {
  experiment: Experiment;
  monthly: MonthlyRisk;
  trades: Trade[];
  setups?: Setup[];
  playbooks?: Playbook[];
  snapshotRevision?: number | null;
  priorAiNotes?: AiNote[];
  options?: SnapshotOptions;
  requestText?: string;
}

export const DEFAULT_SECTIONED_REQUEST = `Analyze all trades and experiment risk.
Return a JSON object with a "notes" array. Each note:
  note_type: analysis | risk | strategy | lesson | action
  trade_id: optional (e.g. H001)
  body: string (required)
  proposal_json: optional inbox proposal object
Do not apply changes — human saves notes in MatrixTrade.`;

export function buildSectionedSnapshot(input: SectionedSnapshotInput): string {
  const {
    experiment,
    monthly,
    trades,
    setups = [],
    playbooks = [],
    snapshotRevision,
    priorAiNotes = [],
    options = {},
    requestText = DEFAULT_SECTIONED_REQUEST,
  } = input;

  const { open, pending, closed } = selectSnapshotTrades(trades, options);
  const winRate = computeWinRate(trades);
  const unreviewedClosed = closed.filter((t) => !t.reviewedAt);
  const generated = new Date().toISOString();
  const revision = snapshotRevision ?? 0;

  const sections = [
    "=== MATRIX ===",
    "version:1",
    `generated:${generated}`,
    `revision:${revision}`,
    "",
    "=== MONTHLY RISK ===",
    `month:${monthly.monthKey}`,
    `base_limit:${formatSigned(monthly.monthlyLossLimit)}`,
    `carryover_in:${monthly.carryoverIn.toFixed(2)}`,
    `effective_cap:${formatSigned(monthly.effectiveLossCap)}`,
    `month_pnl:${formatSigned(monthly.monthlyRealizedPnL)}`,
    `room:${monthly.monthlyLossRoom.toFixed(2)}`,
    "",
    "=== EXPERIMENT ===",
    `net_pnl:${formatSigned(experiment.realizedPnL)}`,
    `gross_loss:${formatSigned(experiment.grossLoss)}`,
    `closed:${experiment.closedTrades}/${experiment.maxTrades}`,
    `wins:${experiment.wins}`,
    `losses:${experiment.losses}`,
    `winrate:${winRate !== null ? Math.round(winRate * 100) : 0}%`,
    "",
    formatTradeSection("=== OPEN TRADES ===", open, setups),
    "",
    formatTradeSection("=== PENDING ORDERS ===", pending, setups),
    "",
    formatTradeSection("=== CLOSED SIN REVIEW ===", unreviewedClosed, setups),
    "",
    formatPlaybookSection(playbooks, trades),
    "",
    formatPriorAiNotesSection(priorAiNotes),
    "",
    "=== REQUEST ===",
    requestText.trim(),
  ];

  return sections.join("\n");
}

export function buildSectionedPacket(
  snapshot: string,
  question = ""
): string {
  const q = question.trim();
  if (!q) return snapshot;
  return `${snapshot}\n\n=== QUESTION ===\n${q}`;
}
