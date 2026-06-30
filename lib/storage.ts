import { promises as fs } from "fs";
import path from "path";
import { readAllTradeNotes } from "./obsidian";
import { computeExperiment } from "./calculate";
import { buildNoteUri, readAllTrades, resolveVaultPath, writeTradeFile } from "./obsidian";
import { validateCloseTrade, validateCreateTrade } from "./validation";
import type {
  CloseTradeInput,
  CreateTradeInput,
  Experiment,
  ExperimentRules,
  Trade,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

async function readJson<T>(filename: string): Promise<T> {
  const filePath = path.join(DATA_DIR, filename);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export async function getRules(): Promise<ExperimentRules> {
  return readJson<ExperimentRules>("rules.json");
}

export async function getTrades(): Promise<Trade[]> {
  const rules = await getRules();
  return readAllTrades(rules);
}

export async function getExperiment(): Promise<Experiment> {
  const [trades, rules] = await Promise.all([getTrades(), getRules()]);
  return computeExperiment(trades, rules.cycleLossLimit, rules.maxTrades);
}

export async function getVaultStatus(): Promise<{
  vaultPath: string;
  tradesFolder: string;
  vaultName: string;
  ready: boolean;
}> {
  const rules = await getRules();
  const vaultPath = resolveVaultPath(rules);
  let ready = false;
  try {
    await fs.access(vaultPath);
    ready = true;
  } catch {
    ready = false;
  }
  return {
    vaultPath,
    tradesFolder: rules.tradesFolder,
    vaultName: rules.obsidianVault,
    ready,
  };
}

export async function getTradeNotes(): Promise<Map<string, string>> {
  const rules = await getRules();
  return readAllTradeNotes(rules);
}

export async function createTrade(input: CreateTradeInput): Promise<{ trade?: Trade; errors?: string[] }> {
  const rules = await getRules();
  const trades = await readAllTrades(rules);
  const experiment = computeExperiment(trades, rules.cycleLossLimit, rules.maxTrades);

  const validationErrors = validateCreateTrade(input, trades, rules, experiment.realizedPnL);

  if (validationErrors.length > 0) {
    return { errors: validationErrors.map((e) => e.message) };
  }

  const id = input.id.toUpperCase();
  const ticker = input.ticker.trim().toUpperCase();

  const trade: Trade = {
    id,
    ticker,
    entry: input.entry,
    stop: input.stop,
    target: input.target,
    shares: input.shares,
    status: "pending",
    obsidianNote: buildNoteUri(id, ticker, rules),
    createdAt: new Date().toISOString(),
    filePath: "",
  };

  await writeTradeFile(trade, rules);
  trade.filePath = path.join(resolveVaultPath(rules), rules.tradesFolder, `${id}-${ticker}.md`);

  return { trade };
}

export async function closeTrade(
  id: string,
  input: CloseTradeInput
): Promise<{ trade?: Trade; errors?: string[] }> {
  const rules = await getRules();
  const trades = await readAllTrades(rules);
  const trade = trades.find((t) => t.id === id.toUpperCase());

  const validationErrors = validateCloseTrade(trade, input);

  if (validationErrors.length > 0) {
    return { errors: validationErrors.map((e) => e.message) };
  }

  const updated: Trade = {
    ...trade!,
    exit: input.exit,
    status: "closed",
    closedAt: new Date().toISOString(),
  };

  await writeTradeFile(updated, rules);

  return { trade: updated };
}

export async function openTrade(id: string): Promise<{ trade?: Trade; errors?: string[] }> {
  const rules = await getRules();
  const trades = await readAllTrades(rules);
  const trade = trades.find((t) => t.id === id.toUpperCase());

  if (!trade) {
    return { errors: ["Trade not found."] };
  }

  if (trade.status === "closed") {
    return { errors: ["Closed trades cannot be reopened."] };
  }

  if (trade.status === "open") {
    return { trade };
  }

  const updated: Trade = { ...trade, status: "open" };
  await writeTradeFile(updated, rules);

  return { trade: updated };
}
