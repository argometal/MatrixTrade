import { promises as fs } from "fs";
import path from "path";
import type { MafExperiment } from "./maf-types";

const DATA_DIR = path.join(process.cwd(), "data");
const EXPERIMENTS_FILE = path.join(DATA_DIR, "maf-experiments.json");

async function readArrayFile<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw err;
  }
}

async function writeArrayFile<T>(filePath: string, rows: T[]): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(rows, null, 2)}\n`, "utf-8");
}

export async function getMafExperiments(): Promise<MafExperiment[]> {
  return readArrayFile<MafExperiment>(EXPERIMENTS_FILE);
}

export async function getMafExperimentById(id: string): Promise<MafExperiment | undefined> {
  const needle = id.toUpperCase();
  const all = await getMafExperiments();
  return all.find((row) => row.id.toUpperCase() === needle);
}

export async function getMafExperimentByTradeId(
  tradeId: string
): Promise<MafExperiment | undefined> {
  const needle = tradeId.toUpperCase();
  const all = await getMafExperiments();
  return all.find((row) => row.tradeId?.toUpperCase() === needle);
}

export async function upsertMafExperiment(row: MafExperiment): Promise<void> {
  const all = await getMafExperiments();
  const idx = all.findIndex((x) => x.id.toUpperCase() === row.id.toUpperCase());
  if (idx >= 0) all[idx] = row;
  else all.push(row);
  all.sort((a, b) => a.id.localeCompare(b.id));
  await writeArrayFile(EXPERIMENTS_FILE, all);
}

export function nextMafExperimentId(rows: MafExperiment[], ticker: string): string {
  const normalized = ticker.trim().toUpperCase();
  const prefix = `MAF-${normalized}-`;
  let max = 0;
  for (const row of rows) {
    if (!row.id.startsWith(prefix)) continue;
    const n = Number(row.id.slice(prefix.length));
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}
