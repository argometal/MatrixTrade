import { promises as fs } from "fs";
import path from "path";
import type { LearningOutcome } from "./learning-outcome-types";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "learning-outcomes.json");

async function readArray(): Promise<LearningOutcome[]> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    const parsed = JSON.parse(raw) as LearningOutcome[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw err;
  }
}

async function writeArray(rows: LearningOutcome[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, `${JSON.stringify(rows, null, 2)}\n`, "utf-8");
}

export async function getLearningOutcomes(): Promise<LearningOutcome[]> {
  return readArray();
}

export async function getLearningOutcomeById(
  id: string
): Promise<LearningOutcome | undefined> {
  const needle = id.toUpperCase();
  return (await readArray()).find((row) => row.id.toUpperCase() === needle);
}

export async function getLearningOutcomeByTradeId(
  tradeId: string
): Promise<LearningOutcome | undefined> {
  const needle = tradeId.toUpperCase();
  return (await readArray()).find((row) => row.tradeId?.toUpperCase() === needle);
}

export async function getLearningOutcomeByPlanId(
  planId: string
): Promise<LearningOutcome | undefined> {
  const needle = planId.toUpperCase();
  const rows = await readArray();
  return rows.find((row) => row.planId?.toUpperCase() === needle && !row.tradeId);
}

export async function upsertLearningOutcome(row: LearningOutcome): Promise<void> {
  const all = await readArray();
  const idx = all.findIndex((x) => x.id.toUpperCase() === row.id.toUpperCase());
  if (idx >= 0) all[idx] = row;
  else all.push(row);
  all.sort((a, b) => a.id.localeCompare(b.id));
  await writeArray(all);
}

export function nextLearningOutcomeId(rows: LearningOutcome[], ticker: string): string {
  const normalized = ticker.trim().toUpperCase();
  const prefix = `LO-${normalized}-`;
  let max = 0;
  for (const row of rows) {
    if (!row.id.startsWith(prefix)) continue;
    const n = Number(row.id.slice(prefix.length));
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}
