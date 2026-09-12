/**
 * Case-bound Market Reality window persistence.
 * Local JSON by default; durable Supabase storage on Vercel/runtime protection paths.
 * Not a market warehouse — only windows acquired for Cases.
 */

import { promises as fs } from "fs";
import path from "path";
import { createSupabaseAdmin } from "./supabase/server";
import { assertMxtPersistenceWriteAllowed } from "./mxt-readonly";
import type { MarketRealityCaseWindow } from "./market-reality-types";

const MXT_MR_STORAGE_BUCKET = "mxt-artifacts";
const STORAGE_PREFIX = "market-reality-windows";

function windowsPath(): string {
  return path.join(process.cwd(), "data", "market-reality-case-windows.json");
}

function isSupabaseMarketRealityStorage(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

function objectPath(id: string): string {
  return `${STORAGE_PREFIX}/${id.toUpperCase()}.json`;
}

async function ensureBucket(): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    throw new Error(`Supabase storage listBuckets failed: ${error.message}`);
  }
  if (buckets?.some((b) => b.name === MXT_MR_STORAGE_BUCKET)) return;
  const { error: createError } = await supabase.storage.createBucket(
    MXT_MR_STORAGE_BUCKET,
    { public: false, fileSizeLimit: 10_000_000 }
  );
  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(
      `Supabase storage createBucket(${MXT_MR_STORAGE_BUCKET}) failed: ${createError.message}`
    );
  }
}

async function readAllFromSupabase(): Promise<MarketRealityCaseWindow[]> {
  await ensureBucket();
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(MXT_MR_STORAGE_BUCKET)
    .list(STORAGE_PREFIX, { limit: 1000 });
  if (error) {
    throw new Error(`Supabase Market Reality storage list failed: ${error.message}`);
  }
  const ids = (data ?? [])
    .map((f) => f.name)
    .filter((n) => n.toLowerCase().endsWith(".json"))
    .map((n) => n.replace(/\.json$/i, ""));
  const rows: MarketRealityCaseWindow[] = [];
  for (const id of ids) {
    const { data: blob, error: dlErr } = await supabase.storage
      .from(MXT_MR_STORAGE_BUCKET)
      .download(objectPath(id));
    if (dlErr) {
      const msg = String(dlErr.message ?? "").toLowerCase();
      if (msg.includes("not found") || msg.includes("404")) continue;
      throw new Error(`Supabase Market Reality download failed: ${dlErr.message}`);
    }
    rows.push(JSON.parse(await blob.text()) as MarketRealityCaseWindow);
  }
  return rows;
}

async function upsertSupabase(row: MarketRealityCaseWindow): Promise<void> {
  assertMxtPersistenceWriteAllowed("market_reality_windows.storage.upsert");
  await ensureBucket();
  const supabase = createSupabaseAdmin();
  const body = JSON.stringify(row, null, 2);
  const { error } = await supabase.storage
    .from(MXT_MR_STORAGE_BUCKET)
    .upload(objectPath(row.id), body, {
      contentType: "application/json",
      upsert: true,
    });
  if (error) {
    throw new Error(`Supabase Market Reality upload failed: ${error.message}`);
  }
}

async function readAll(): Promise<MarketRealityCaseWindow[]> {
  if (isSupabaseMarketRealityStorage()) return readAllFromSupabase();
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
  if (isSupabaseMarketRealityStorage()) {
    const existing = await readAllFromSupabase();
    const merged = new Map(existing.map((row) => [row.id, row] as const));
    for (const row of rows) merged.set(row.id, row);
    for (const row of merged.values()) {
      await upsertSupabase(row);
    }
    return;
  }
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
