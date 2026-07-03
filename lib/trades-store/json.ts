import { promises as fs } from "fs";
import path from "path";
import type { Trade } from "../types";
import { stripComputedTradeFields } from "./mapping";
import type { TradesStore } from "./types";

const TRADES_FILE = path.join(process.cwd(), "data", "trades.json");

export async function readTradesJsonFile(): Promise<Trade[]> {
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

async function writeTradesJsonFile(trades: Trade[]): Promise<void> {
  await fs.mkdir(path.dirname(TRADES_FILE), { recursive: true });
  const tmp = `${TRADES_FILE}.tmp`;
  const payload = trades.map(stripComputedTradeFields);
  await fs.writeFile(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  await fs.rename(tmp, TRADES_FILE);
}

export function createJsonTradesStore(): TradesStore {
  return {
    async readAll() {
      return readTradesJsonFile();
    },
    async upsert(trade) {
      const trades = await readTradesJsonFile();
      const id = trade.id.toUpperCase();
      const idx = trades.findIndex((t) => t.id.toUpperCase() === id);
      const stored = stripComputedTradeFields({ ...trade, id });
      if (idx >= 0) {
        trades[idx] = stored;
      } else {
        trades.push(stored);
      }
      trades.sort((a, b) => a.id.localeCompare(b.id));
      await writeTradesJsonFile(trades);
    },
  };
}
