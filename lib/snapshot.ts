import { calculateTradeResult } from "./calculate";
import type { Experiment, Trade } from "./types";

function formatSigned(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(2)}`;
}

function formatPrice(value: number): string {
  return value.toFixed(2);
}

function formatTrade(trade: Trade): string {
  const lines: string[] = [];
  lines.push(`${trade.id} ${trade.ticker}`);
  lines.push(`Entry: ${formatPrice(trade.entry)}`);
  if (trade.exit !== undefined) {
    lines.push(`Exit: ${formatPrice(trade.exit)}`);
  }
  lines.push(`Shares: ${trade.shares}`);
  const pnl = calculateTradeResult(trade);
  if (pnl !== null) {
    lines.push(`P/L: ${formatSigned(pnl)}`);
  }
  lines.push(`Status: ${trade.status}`);
  lines.push(`Stop: ${formatPrice(trade.stop)}`);
  return lines.join("\n");
}

function formatSection(title: string, trades: Trade[]): string {
  if (trades.length === 0) {
    return `${title}\n(none)`;
  }
  return `${title}\n${trades.map(formatTrade).join("\n\n")}`;
}

export interface SnapshotOptions {
  /** Include all closed trades instead of recent only */
  full?: boolean;
  recentClosedLimit?: number;
}

export function selectSnapshotTrades(
  trades: Trade[],
  options: SnapshotOptions = {}
): { open: Trade[]; pending: Trade[]; closed: Trade[]; totalClosed: number } {
  const { full = false, recentClosedLimit = 10 } = options;

  const open = trades
    .filter((t) => t.status === "open")
    .sort((a, b) => a.id.localeCompare(b.id));
  const pending = trades
    .filter((t) => t.status === "pending")
    .sort((a, b) => a.id.localeCompare(b.id));

  let closed = trades.filter((t) => t.status === "closed");
  closed.sort((a, b) =>
    (b.closedAt ?? b.createdAt).localeCompare(a.closedAt ?? a.createdAt)
  );
  const totalClosed = closed.length;
  if (!full && closed.length > recentClosedLimit) {
    closed = closed.slice(0, recentClosedLimit);
  }
  closed.sort((a, b) => a.id.localeCompare(b.id));

  return { open, pending, closed, totalClosed };
}

export function buildSnapshot(
  experiment: Experiment,
  trades: Trade[],
  options: SnapshotOptions = {}
): string {
  const { full = false, recentClosedLimit = 10 } = options;
  const today = new Date().toISOString().slice(0, 10);
  const { open, pending, closed, totalClosed } = selectSnapshotTrades(trades, options);

  const closedTitle =
    full || totalClosed <= recentClosedLimit
      ? "CLOSED TRADES:"
      : `CLOSED TRADES (recent ${closed.length} of ${totalClosed}):`;

  return [
    "MATRIX TRADE SNAPSHOT",
    `Date: ${today}`,
    "Cycle: 1",
    "",
    `Loss limit: ${formatSigned(experiment.cycleLossLimit)}`,
    `Realized P/L: ${formatSigned(experiment.realizedPnL)}`,
    `Remaining risk: ${formatSigned(experiment.remainingLossBudget)}`,
    "",
    `Closed trades: ${experiment.closedTrades} / ${experiment.maxTrades}`,
    `Wins: ${experiment.wins}`,
    `Losses: ${experiment.losses}`,
    "",
    formatSection("OPEN TRADES:", open),
    "",
    formatSection("PENDING ORDERS:", pending),
    "",
    formatSection(closedTitle, closed),
  ].join("\n");
}

function cleanNoteBody(body: string): string {
  let text = body.trim();
  text = text.replace(/^> MatrixTrade manages[^\n]*\n*/i, "");
  text = text.replace(/^#\s+H\d{3}\s*·[^\n]*\n*/i, "");
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function formatTradeAnalysis(trade: Trade, noteBody: string): string {
  const cleaned = cleanNoteBody(noteBody);
  const header = `${trade.id} ${trade.ticker}`;

  if (!cleaned) {
    return `${header}\n(no analysis written in Obsidian yet)`;
  }

  return `${header}\n${cleaned}`;
}

export function buildAnalysisSection(
  trades: Trade[],
  notes: Map<string, string>
): string {
  if (trades.length === 0) {
    return "ANALYSIS FROM OBSIDIAN:\n(none)";
  }

  const blocks = trades.map((trade) =>
    formatTradeAnalysis(trade, notes.get(trade.id) ?? "")
  );

  return ["ANALYSIS FROM OBSIDIAN:", "", blocks.join("\n\n---\n\n")].join("\n");
}

export function buildFullContext(
  experiment: Experiment,
  trades: Trade[],
  notes: Map<string, string>,
  options: SnapshotOptions = {}
): string {
  const snapshot = buildSnapshot(experiment, trades, options);
  const { open, pending, closed } = selectSnapshotTrades(trades, options);
  const withNotes = [...open, ...pending, ...closed];
  const analysis = buildAnalysisSection(withNotes, notes);

  return [
    "MATRIX TRADE FULL CONTEXT",
    "(numbers + Obsidian analysis — paste into ChatGPT)",
    "",
    snapshot,
    "",
    analysis,
  ].join("\n");
}

const DEFAULT_QUESTION =
  "Review my experiment state, trade analysis, and risk. What should I focus on next?";

export function buildPacket(
  fullContext: string,
  question = "",
  screenshots: string[] = []
): string {
  const screenshotLines =
    screenshots.length > 0
      ? screenshots.map((name) => `- ${name}`).join("\n")
      : "(none)";

  return [
    "MATRIX TRADE PACKET",
    "",
    "Context:",
    fullContext,
    "",
    "Screenshots attached:",
    screenshotLines,
    "",
    "Question:",
    question.trim() || DEFAULT_QUESTION,
  ].join("\n");
}
