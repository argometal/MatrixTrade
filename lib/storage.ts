import { promises as fs } from "fs";
import path from "path";
import { computeExperiment } from "./calculate";
import { readNoteBody, resolveVaultPath, writeTradeFile, buildNoteUri } from "./obsidian";
import { enrichTrade, absoluteNotePath } from "./trade-links";
import { readTradesJson, upsertTradeInJson } from "./trades-json";
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
  const [rules, raw] = await Promise.all([getRules(), readTradesJson()]);
  return raw.map((t) => enrichTrade(t, rules));
}

export async function getTradeById(id: string): Promise<Trade | undefined> {
  const trades = await getTrades();
  return trades.find((t) => t.id === id.toUpperCase());
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
  dataFile: string;
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
    dataFile: path.join(DATA_DIR, "trades.json"),
  };
}

export async function getTradeNotes(): Promise<Map<string, string>> {
  const [trades, rules] = await Promise.all([getTrades(), getRules()]);
  const notes = new Map<string, string>();

  for (const trade of trades) {
    let body = "";
    try {
      body = await readNoteBody(absoluteNotePath(trade, rules));
    } catch {
      body = "";
    }
    if (!body.trim()) {
      body = [trade.thesis, trade.psychology, trade.lessons, trade.notes].filter(Boolean).join("\n\n");
    }
    notes.set(trade.id, body);
  }

  return notes;
}

export async function createTrade(input: CreateTradeInput): Promise<{ trade?: Trade; errors?: string[] }> {
  const rules = await getRules();
  const trades = await getTrades();
  const experiment = computeExperiment(trades, rules.cycleLossLimit, rules.maxTrades);

  const validationErrors = validateCreateTrade(input, trades, rules, experiment.realizedPnL);
  if (validationErrors.length > 0) {
    return { errors: validationErrors.map((e) => e.message) };
  }

  const id = input.id.toUpperCase();
  const ticker = input.ticker.trim().toUpperCase();

  const trade: Trade = enrichTrade(
    {
      id,
      ticker,
      entry: input.entry,
      stop: input.stop,
      target: input.target,
      shares: input.shares,
      status: input.status ?? "pending",
      thesis: input.thesis,
      psychology: input.psychology,
      lessons: input.lessons,
      notes: input.notes,
      createdAt: new Date().toISOString(),
    },
    rules
  );

  await upsertTradeInJson(trade);
  await writeTradeFile(
    { ...trade, obsidianNote: buildNoteUri(id, ticker, rules), notePath: trade.notePath! },
    rules
  );

  return { trade };
}

export async function closeTrade(
  id: string,
  input: CloseTradeInput
): Promise<{ trade?: Trade; errors?: string[] }> {
  const rules = await getRules();
  const trades = await getTrades();
  const trade = trades.find((t) => t.id === id.toUpperCase());

  const validationErrors = validateCloseTrade(trade, input);
  if (validationErrors.length > 0) {
    return { errors: validationErrors.map((e) => e.message) };
  }

  const updated = enrichTrade(
    {
      ...trade!,
      exit: input.exit,
      status: "closed",
      closedAt: new Date().toISOString(),
    },
    rules
  );

  await upsertTradeInJson(updated);
  await writeTradeFile(
    { ...updated, obsidianNote: updated.obsidianNote!, notePath: updated.notePath! },
    rules
  );

  return { trade: updated };
}

export async function openTrade(id: string): Promise<{ trade?: Trade; errors?: string[] }> {
  const rules = await getRules();
  const trades = await getTrades();
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

  const updated = enrichTrade({ ...trade, status: "open" }, rules);
  await upsertTradeInJson(updated);
  await writeTradeFile(
    { ...updated, obsidianNote: updated.obsidianNote!, notePath: updated.notePath! },
    rules
  );

  return { trade: updated };
}
