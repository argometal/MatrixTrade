import { promises as fs } from "fs";
import path from "path";
import type { ExperimentRules, Trade, TradeStatus } from "./types";
import { isValidExperimentId } from "./validation";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const MT_VERSION = 1;

export function tradeFilename(id: string, ticker: string): string {
  return `${id.toUpperCase()}-${ticker.toUpperCase()}.md`;
}

export function resolveVaultPath(rules: ExperimentRules): string {
  const { obsidianVaultPath } = rules;
  if (path.isAbsolute(obsidianVaultPath)) {
    return obsidianVaultPath;
  }
  return path.join(process.cwd(), obsidianVaultPath);
}

export function resolveTradesDir(rules: ExperimentRules): string {
  return path.join(resolveVaultPath(rules), rules.tradesFolder);
}

function parseFrontmatterLines(yaml: string): Record<string, string> {
  const data: Record<string, string> = {};
  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colon = trimmed.indexOf(":");
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    let value = trimmed.slice(colon + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return data;
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === "" || value === "null") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseRequiredNumber(value: string | undefined, field: string): number {
  const n = parseOptionalNumber(value);
  if (n === undefined) {
    throw new Error(`Invalid or missing numeric field: ${field}`);
  }
  if (n <= 0) {
    throw new Error(`Field ${field} must be > 0`);
  }
  return n;
}

export function buildNoteUri(id: string, ticker: string, rules: ExperimentRules): string {
  const file = `${rules.tradesFolder}/${id}-${ticker.toUpperCase()}`;
  return `obsidian://open?vault=${encodeURIComponent(rules.obsidianVault)}&file=${encodeURIComponent(file)}`;
}

export function parseTradeFile(filePath: string, content: string, rules: ExperimentRules): Trade {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    throw new Error(`Missing frontmatter in ${filePath}`);
  }

  const raw = parseFrontmatterLines(match[1]);
  if (raw.matrixtrade !== "true") {
    throw new Error(`Not a MatrixTrade note: ${filePath}`);
  }

  const id = (raw.id ?? "").toUpperCase();
  const ticker = (raw.ticker ?? "").trim().toUpperCase();
  const status = raw.status as TradeStatus;

  if (!isValidExperimentId(id)) {
    throw new Error(`Invalid experiment ID: ${id}`);
  }

  if (!ticker) {
    throw new Error("Missing or empty ticker");
  }

  if (!["pending", "open", "closed"].includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const trade: Trade = {
    id,
    ticker,
    entry: parseRequiredNumber(raw.entry, "entry"),
    exit: parseOptionalNumber(raw.exit),
    stop: parseRequiredNumber(raw.stop, "stop"),
    target: parseOptionalNumber(raw.target),
    shares: parseRequiredNumber(raw.shares, "shares"),
    status,
    createdAt: raw.createdAt ?? new Date(0).toISOString(),
    closedAt: raw.closedAt || undefined,
    obsidianNote: buildNoteUri(id, ticker, rules),
    notePath: `${rules.obsidianVaultPath}/${rules.tradesFolder}/${id}-${ticker}.md`.replace(/\\/g, "/"),
  };

  if (status === "closed" && trade.exit === undefined) {
    trade.inconsistent = true;
  }

  return trade;
}

function serializeValue(value: string | number | undefined): string {
  if (value === undefined || value === "") return "";
  return String(value);
}

export function defaultNoteBody(trade: Trade): string {
  return `# ${trade.id} · ${trade.ticker}

> MatrixTrade manages the frontmatter above. Write your analysis below.

## Tesis



## Multi-timeframe



## Psicología



## Lecciones
`;
}

export function serializeTradeFile(trade: Trade, body: string): string {
  const lines = [
    "---",
    "matrixtrade: true",
    `mtVersion: ${MT_VERSION}`,
    `id: ${trade.id}`,
    `ticker: ${trade.ticker}`,
    `entry: ${trade.entry}`,
    `stop: ${trade.stop}`,
    `target: ${serializeValue(trade.target)}`,
    `shares: ${trade.shares}`,
    `status: ${trade.status}`,
    `exit: ${serializeValue(trade.exit)}`,
    `createdAt: ${trade.createdAt}`,
    `closedAt: ${serializeValue(trade.closedAt)}`,
  ];

  if (trade.setupId) lines.push(`setupId: ${trade.setupId}`);
  if (trade.mistakes?.length) lines.push(`mistakes: ${trade.mistakes.join(",")}`);
  if (trade.qualityEntry) lines.push(`qualityEntry: ${trade.qualityEntry}`);
  if (trade.qualityExit) lines.push(`qualityExit: ${trade.qualityExit}`);
  if (trade.qualityMgmt) lines.push(`qualityMgmt: ${trade.qualityMgmt}`);
  if (trade.reviewedAt) lines.push(`reviewedAt: ${trade.reviewedAt}`);
  if (trade.lesson) lines.push(`lesson: ${JSON.stringify(trade.lesson)}`);
  if (trade.actionItem) lines.push(`actionItem: ${JSON.stringify(trade.actionItem)}`);

  lines.push("---");

  const trimmedBody = body.trim();
  if (trimmedBody) {
    return `${lines.join("\n")}\n\n${trimmedBody}\n`;
  }

  return `${lines.join("\n")}\n\n${defaultNoteBody(trade)}\n`;
}

export function extractNoteBody(content: string): string {
  const match = content.match(FRONTMATTER_RE);
  return match ? match[2].trim() : content.trim();
}

export async function readNoteBody(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, "utf-8");
  return extractNoteBody(content);
}

export async function readAllTradeNotes(
  rules: ExperimentRules
): Promise<Map<string, string>> {
  const trades = await readAllTrades(rules);
  const notes = new Map<string, string>();

  await Promise.all(
    trades.map(async (trade) => {
      try {
        const abs = path.join(resolveTradesDir(rules), tradeFilename(trade.id, trade.ticker));
        const body = await readNoteBody(abs);
        notes.set(trade.id, body);
      } catch {
        notes.set(trade.id, "");
      }
    })
  );

  return notes;
}

export async function ensureTradesDir(rules: ExperimentRules): Promise<string> {
  const tradesDir = resolveTradesDir(rules);
  await fs.mkdir(tradesDir, { recursive: true });
  return tradesDir;
}

export async function readAllTrades(rules: ExperimentRules): Promise<Trade[]> {
  const tradesDir = await ensureTradesDir(rules);
  let entries: string[];

  try {
    entries = await fs.readdir(tradesDir);
  } catch {
    return [];
  }

  const trades: Trade[] = [];
  let valid = 0;
  let invalid = 0;

  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const filePath = path.join(tradesDir, entry);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      trades.push(parseTradeFile(filePath, content, rules));
      valid++;
    } catch (err) {
      invalid++;
      console.warn(`[MatrixTrade] Skipped invalid file: ${filePath}`, err);
    }
  }

  console.log(`[MatrixTrade] Loaded ${valid} trades, skipped ${invalid}`);

  return trades.sort((a, b) => a.id.localeCompare(b.id));
}

/** Atomic write: temp file then rename. Preserves note body. */
export async function writeTradeFile(trade: Trade, rules: ExperimentRules): Promise<void> {
  const tradesDir = await ensureTradesDir(rules);
  const filename = tradeFilename(trade.id, trade.ticker);
  const filePath = path.join(tradesDir, filename);
  const tmpPath = `${filePath}.matrixtrade.tmp`;

  let body = defaultNoteBody(trade);
  try {
    const existing = await fs.readFile(filePath, "utf-8");
    body = extractNoteBody(existing);
    if (!body) body = defaultNoteBody(trade);
  } catch {
    // new file
  }

  const content = serializeTradeFile(trade, body);
  await fs.writeFile(tmpPath, content, "utf-8");
  await fs.rename(tmpPath, filePath);
}
