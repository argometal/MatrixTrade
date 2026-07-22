import { promises as fs } from "fs";
import path from "path";
import type { ObservationRecord } from "./observation-types";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "observations.json");

async function readArray(): Promise<ObservationRecord[]> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    const parsed = JSON.parse(raw) as ObservationRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw err;
  }
}

async function writeArray(rows: ObservationRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, `${JSON.stringify(rows, null, 2)}\n`, "utf-8");
}

export async function getObservations(): Promise<ObservationRecord[]> {
  return readArray();
}

export async function getObservationById(
  id: string
): Promise<ObservationRecord | undefined> {
  const needle = id.toUpperCase();
  return (await readArray()).find((row) => row.id.toUpperCase() === needle);
}

export async function getObservationByTradeId(
  tradeId: string
): Promise<ObservationRecord | undefined> {
  const needle = tradeId.toUpperCase();
  return (await readArray()).find((row) => row.tradeId?.toUpperCase() === needle);
}

export async function getObservationByPlanId(
  planId: string
): Promise<ObservationRecord | undefined> {
  const needle = planId.toUpperCase();
  return (await readArray()).find(
    (row) => row.planId?.toUpperCase() === needle && !row.tradeId
  );
}

export async function upsertObservation(row: ObservationRecord): Promise<void> {
  const all = await readArray();
  const idx = all.findIndex((x) => x.id.toUpperCase() === row.id.toUpperCase());
  if (idx >= 0) all[idx] = row;
  else all.push(row);
  all.sort((a, b) => a.id.localeCompare(b.id));
  await writeArray(all);
}

export function nextObservationId(rows: ObservationRecord[], ticker: string): string {
  const normalized = ticker.trim().toUpperCase();
  const prefix = `OBS-${normalized}-`;
  let max = 0;
  for (const row of rows) {
    if (!row.id.startsWith(prefix)) continue;
    const n = Number(row.id.slice(prefix.length));
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}
