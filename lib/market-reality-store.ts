/**
 * Case-bound Market Reality window persistence (local JSON).
 * Not a market warehouse — only windows acquired for Cases.
 */

import { promises as fs } from "fs";
import path from "path";
import type { MarketRealityCaseWindow } from "./market-reality-types";

function windowsPath(): string {
  return path.join(process.cwd(), "data", "market-reality-case-windows.json");
}

function assertWritesAllowed(): void {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    throw new Error(
      "Market Reality JSON store cannot write on Vercel in #12C MVP (local Case evaluation)."
    );
  }
}

async function readAll(): Promise<MarketRealityCaseWindow[]> {
  try {
    const raw = await fs.readFile(windowsPath(), "utf-8");
    const parsed = JSON.parse(raw) as MarketRealityCaseWindow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(rows: MarketRealityCaseWindow[]): Promise<void> {
  assertWritesAllowed();
  await fs.mkdir(path.dirname(windowsPath()), { recursive: true });
  await fs.writeFile(windowsPath(), JSON.stringify(rows, null, 2), "utf-8");
}

export async function listMarketRealityWindows(): Promise<
  MarketRealityCaseWindow[]
> {
  return readAll();
}

export async function getMarketRealityWindowById(
  id: string
): Promise<MarketRealityCaseWindow | null> {
  const all = await readAll();
  return all.find((w) => w.id === id) ?? null;
}

export async function findMarketRealityWindow(input: {
  planId: string;
  windowKind: MarketRealityCaseWindow["windowKind"];
}): Promise<MarketRealityCaseWindow | null> {
  const all = await readAll();
  const plan = input.planId.toUpperCase();
  return (
    all.find(
      (w) =>
        w.planId.toUpperCase() === plan && w.windowKind === input.windowKind
    ) ?? null
  );
}

export async function upsertMarketRealityWindow(
  row: MarketRealityCaseWindow
): Promise<void> {
  const all = await readAll();
  const idx = all.findIndex((w) => w.id === row.id);
  if (idx >= 0) all[idx] = row;
  else all.push(row);
  await writeAll(all);
}

/** Test helper — in-memory only. */
let memoryOverride: MarketRealityCaseWindow[] | null = null;

export function setMarketRealityWindowsForTests(
  rows: MarketRealityCaseWindow[] | null
): void {
  memoryOverride = rows;
}

export async function listMarketRealityWindowsForRead(): Promise<
  MarketRealityCaseWindow[]
> {
  if (memoryOverride) return structuredClone(memoryOverride);
  return readAll();
}

export async function upsertMarketRealityWindowMaybeMemory(
  row: MarketRealityCaseWindow
): Promise<void> {
  if (memoryOverride) {
    const idx = memoryOverride.findIndex((w) => w.id === row.id);
    if (idx >= 0) memoryOverride[idx] = structuredClone(row);
    else memoryOverride.push(structuredClone(row));
    return;
  }
  await upsertMarketRealityWindow(row);
}

export async function findMarketRealityWindowForRead(input: {
  planId: string;
  windowKind: MarketRealityCaseWindow["windowKind"];
}): Promise<MarketRealityCaseWindow | null> {
  const all = await listMarketRealityWindowsForRead();
  const plan = input.planId.toUpperCase();
  return (
    all.find(
      (w) =>
        w.planId.toUpperCase() === plan && w.windowKind === input.windowKind
    ) ?? null
  );
}
