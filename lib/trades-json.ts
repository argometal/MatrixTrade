import { promises as fs } from "fs";
import path from "path";
import type { Trade } from "./types";

const TRADES_FILE = path.join(process.cwd(), "data", "trades.json");

export async function readTradesJson(): Promise<Trade[]> {
  try {
    const raw = await fs.readFile(TRADES_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Trade[] | { trades: Trade[] };
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && Array.isArray(parsed.trades)) {
      return parsed.trades;
    }
    return [];
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

export async function writeTradesJson(trades: Trade[]): Promise<void> {
  await fs.mkdir(path.dirname(TRADES_FILE), { recursive: true });
  const tmp = `${TRADES_FILE}.tmp`;
  const payload = trades.map(stripComputedFields);
  await fs.writeFile(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  await fs.rename(tmp, TRADES_FILE);
}

function stripComputedFields(trade: Trade): Trade {
  const { obsidianNote: _o, notePath: _n, ...rest } = trade;
  return rest;
}

export async function upsertTradeInJson(trade: Trade): Promise<void> {
  const trades = await readTradesJson();
  const id = trade.id.toUpperCase();
  const idx = trades.findIndex((t) => t.id.toUpperCase() === id);
  const stored = stripComputedFields({ ...trade, id });
  if (idx >= 0) {
    trades[idx] = stored;
  } else {
    trades.push(stored);
  }
  trades.sort((a, b) => a.id.localeCompare(b.id));
  await writeTradesJson(trades);
}
