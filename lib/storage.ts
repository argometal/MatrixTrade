import { promises as fs } from "fs";
import path from "path";
import { computeExperiment } from "./calculate";
import { computeMonthlyRisk, type MonthlyRisk } from "./monthly-risk";
import { readNoteBody, resolveVaultPath } from "./obsidian";
import { syncObsidianTradeIfLocal } from "./obsidian-local";
import { enrichTrade, absoluteNotePath } from "./trade-links";
import { isSupabaseTradesStore, readTradesJson, upsertTradeInJson } from "./trades-json";
import { startObservationForTrade } from "./trade-evaluation";
import { validateCloseTrade, validateCreateTrade } from "./validation";
import type {
  CloseTradeInput,
  CreateTradeInput,
  Experiment,
  ExperimentRules,
  MistakeType,
  SaveReviewInput,
  Trade,
  TradeMetaInput,
  TradeStatus,
  UpdateTradeInput,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

const DEFAULT_RULES: ExperimentRules = {
  monthlyLossLimit: -300,
  carryoverEnabled: true,
  maxLossPerTicker: -250,
  obsidianVault: "TradingVault",
  obsidianVaultPath: "vault",
  tradesFolder: "Trades",
};

async function readJson<T>(filename: string): Promise<T> {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (filename === "rules.json" && code === "ENOENT") {
      return DEFAULT_RULES as T;
    }
    throw err;
  }
}

function normalizeRules(raw: ExperimentRules): ExperimentRules {
  const monthlyLossLimit = raw.monthlyLossLimit ?? raw.cycleLossLimit ?? -300;
  return {
    monthlyLossLimit,
    carryoverEnabled: raw.carryoverEnabled !== false,
    maxLossPerTicker: raw.maxLossPerTicker ?? -250,
    obsidianVault: raw.obsidianVault,
    obsidianVaultPath: raw.obsidianVaultPath,
    tradesFolder: raw.tradesFolder,
  };
}

async function writeJson<T>(filename: string, data: T): Promise<void> {
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

export async function getRules(): Promise<ExperimentRules> {
  const raw = await readJson<ExperimentRules>("rules.json");
  return normalizeRules(raw);
}

export async function saveRules(input: {
  monthlyLossLimit: number;
  maxLossPerTicker: number;
  carryoverEnabled?: boolean;
}): Promise<{ rules?: ExperimentRules; errors?: string[] }> {
  const current = await getRules();
  const errors: string[] = [];

  if (!Number.isFinite(input.monthlyLossLimit) || input.monthlyLossLimit >= 0) {
    errors.push("Monthly loss limit must be a negative number (e.g. -300).");
  }
  if (!Number.isFinite(input.maxLossPerTicker) || input.maxLossPerTicker >= 0) {
    errors.push("Per-stock loss limit must be a negative number (e.g. -250).");
  }

  if (errors.length > 0) return { errors };

  const rules: ExperimentRules = {
    ...current,
    monthlyLossLimit: input.monthlyLossLimit,
    maxLossPerTicker: input.maxLossPerTicker,
    carryoverEnabled: input.carryoverEnabled !== false,
  };
  await writeJson("rules.json", rules);
  return { rules };
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
  return computeExperiment(trades);
}

export async function getMonthlyRisk(monthKey?: string): Promise<MonthlyRisk> {
  const [trades, rules] = await Promise.all([getTrades(), getRules()]);
  return computeMonthlyRisk(trades, rules.monthlyLossLimit, monthKey, {
    carryoverEnabled: rules.carryoverEnabled,
  });
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
    dataFile: isSupabaseTradesStore() ? "supabase:trades" : path.join(DATA_DIR, "trades.json"),
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
  const monthly = computeMonthlyRisk(trades, rules.monthlyLossLimit, undefined, {
    carryoverEnabled: rules.carryoverEnabled,
  });

  const validationErrors = validateCreateTrade(input, trades, rules, monthly);
  if (validationErrors.length > 0) {
    return { errors: validationErrors.map((e) => e.message) };
  }

  const id = input.id.toUpperCase();
  const ticker = input.ticker.trim().toUpperCase();

  const status = input.status ?? "pending";
  const now = new Date().toISOString();

  const trade: Trade = enrichTrade(
    {
      id,
      ticker,
      entry: input.entry,
      stop: input.stop,
      target: input.target,
      shares: input.shares,
      status,
      setupId: input.setupId?.trim() || undefined,
      playbookId: input.playbookId?.trim() || undefined,
      setup: input.setup?.trim() || undefined,
      direction: input.direction,
      plannedRisk: input.plannedRisk,
      actualRisk: input.actualRisk,
      riskRewardPlanned: input.riskRewardPlanned,
      riskRewardActual: input.riskRewardActual,
      thesis: input.thesis,
      psychology: input.psychology,
      lessons: input.lessons,
      notes: input.notes,
      planId: input.planId?.trim().toUpperCase() || undefined,
      openedAt: status === "open" ? now : undefined,
      createdAt: now,
    },
    rules
  );

  await upsertTradeInJson(trade);
  await syncObsidianTradeIfLocal(trade, rules);

  return { trade };
}

export async function closeTrade(
  id: string,
  input: CloseTradeInput
): Promise<{ trade?: Trade; errors?: string[] }> {
  const rules = await getRules();
  const trades = await getTrades();
  const trade = trades.find((t) => t.id === id.toUpperCase());
  const monthly = computeMonthlyRisk(trades, rules.monthlyLossLimit, undefined, {
    carryoverEnabled: rules.carryoverEnabled,
  });

  const validationErrors = validateCloseTrade(trade, input, rules, monthly, trades);
  if (validationErrors.length > 0) {
    return { errors: validationErrors.map((e) => e.message) };
  }

  const closedAt = new Date().toISOString();
  const updated = enrichTrade(
    {
      ...trade!,
      exit: input.exit,
      status: "closed",
      closedAt,
      exitReason: input.exitReason,
    },
    rules
  );

  await upsertTradeInJson(updated);
  await syncObsidianTradeIfLocal(updated, rules);
  await startObservationForTrade(updated);

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

  const now = new Date().toISOString();
  const updated = enrichTrade(
    { ...trade, status: "open", openedAt: trade.openedAt ?? now },
    rules
  );
  await upsertTradeInJson(updated);
  await syncObsidianTradeIfLocal(updated, rules);

  return { trade: updated };
}

export async function saveTradeReview(
  id: string,
  input: SaveReviewInput
): Promise<{ trade?: Trade; errors?: string[] }> {
  const rules = await getRules();
  const trades = await getTrades();
  const trade = trades.find((t) => t.id === id.toUpperCase());

  if (!trade) {
    return { errors: ["Trade not found."] };
  }
  if (trade.status !== "closed") {
    return { errors: ["Only closed trades can be reviewed."] };
  }

  const rateError = (n: number, field: string) => {
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      return `${field} must be between 1 and 5.`;
    }
    return null;
  };

  const errors: string[] = [];
  const qe = rateError(input.qualityEntry, "Entry quality");
  const qx = rateError(input.qualityExit, "Exit quality");
  const qm = rateError(input.qualityMgmt, "Management quality");
  if (qe) errors.push(qe);
  if (qx) errors.push(qx);
  if (qm) errors.push(qm);

  if (errors.length > 0) {
    return { errors };
  }

  const mistakes: MistakeType[] = input.mistakes?.length
    ? input.mistakes.slice(0, 3)
    : ["none"];

  const updated = enrichTrade(
    {
      ...trade,
      mistakes: [...mistakes],
      qualityEntry: input.qualityEntry,
      qualityExit: input.qualityExit,
      qualityMgmt: input.qualityMgmt,
      lesson: input.lesson?.trim().slice(0, 280) || undefined,
      actionItem: input.actionItem?.trim().slice(0, 280) || undefined,
      reviewedAt: new Date().toISOString(),
    },
    rules
  );

  await upsertTradeInJson(updated);
  await syncObsidianTradeIfLocal(updated, rules);

  return { trade: updated };
}

export async function updateTradeMeta(
  id: string,
  input: TradeMetaInput
): Promise<{ trade?: Trade; errors?: string[] }> {
  const rules = await getRules();
  const trades = await getTrades();
  const trade = trades.find((t) => t.id === id.toUpperCase());

  if (!trade) {
    return { errors: ["Trade not found."] };
  }

  const playbookIdRaw = input.playbookId;
  const updated = enrichTrade(
    {
      ...trade,
      playbookId:
        playbookIdRaw === "" || playbookIdRaw === "__none__"
          ? undefined
          : playbookIdRaw?.trim() || trade.playbookId,
      setup: input.setup !== undefined ? input.setup.trim() || undefined : trade.setup,
      setupId:
        input.setupId === "" || input.setupId === "__none__"
          ? undefined
          : input.setupId?.trim() || trade.setupId,
      direction: input.direction ?? trade.direction,
      plannedRisk: input.plannedRisk ?? trade.plannedRisk,
      actualRisk: input.actualRisk ?? trade.actualRisk,
      riskRewardPlanned: input.riskRewardPlanned ?? trade.riskRewardPlanned,
      riskRewardActual: input.riskRewardActual ?? trade.riskRewardActual,
      closedAt:
        input.closedAt !== undefined
          ? input.closedAt.trim() || undefined
          : trade.closedAt,
    },
    rules
  );

  await upsertTradeInJson(updated);
  await syncObsidianTradeIfLocal(updated, rules);

  return { trade: updated };
}

function parseTradeStatus(value: unknown): TradeStatus | undefined {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "pending" || raw === "open" || raw === "closed") return raw;
  return undefined;
}

export async function updateTrade(
  id: string,
  input: UpdateTradeInput
): Promise<{ trade?: Trade; errors?: string[] }> {
  const rules = await getRules();
  const trade = (await getTrades()).find((t) => t.id === id.toUpperCase());

  if (!trade) {
    return { errors: ["Trade not found."] };
  }

  const nextStatus = input.status !== undefined ? parseTradeStatus(input.status) : trade.status;
  if (input.status !== undefined && !nextStatus) {
    return { errors: ["status must be pending, open, or closed."] };
  }

  const updated = enrichTrade(
    {
      ...trade,
      ticker: input.ticker !== undefined ? String(input.ticker).trim().toUpperCase() : trade.ticker,
      entry: input.entry ?? trade.entry,
      exit: input.exit ?? trade.exit,
      stop: input.stop ?? trade.stop,
      target: input.target ?? trade.target,
      shares: input.shares ?? trade.shares,
      status: nextStatus ?? trade.status,
      thesis: input.thesis !== undefined ? String(input.thesis) : trade.thesis,
      psychology: input.psychology !== undefined ? String(input.psychology) : trade.psychology,
      lessons: input.lessons !== undefined ? String(input.lessons) : trade.lessons,
      notes: input.notes !== undefined ? String(input.notes) : trade.notes,
      playbookId:
        input.playbookId === "" || input.playbookId === "__none__"
          ? undefined
          : input.playbookId !== undefined
            ? String(input.playbookId).trim() || undefined
            : trade.playbookId,
      setupId:
        input.setupId === "" || input.setupId === "__none__"
          ? undefined
          : input.setupId !== undefined
            ? String(input.setupId).trim() || undefined
            : trade.setupId,
      setup: input.setup !== undefined ? input.setup.trim() || undefined : trade.setup,
      direction: input.direction ?? trade.direction,
      plannedRisk: input.plannedRisk ?? trade.plannedRisk,
      actualRisk: input.actualRisk ?? trade.actualRisk,
      riskRewardPlanned: input.riskRewardPlanned ?? trade.riskRewardPlanned,
      riskRewardActual: input.riskRewardActual ?? trade.riskRewardActual,
      closedAt:
        input.closedAt !== undefined
          ? input.closedAt.trim() || undefined
          : trade.closedAt,
    },
    rules
  );

  await upsertTradeInJson(updated);
  await syncObsidianTradeIfLocal(updated, rules);

  return { trade: updated };
}
