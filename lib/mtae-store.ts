import { promises as fs } from "fs";
import path from "path";
import type { MtaeAssessment, MtaeCalibration, MtaeTimeframeMapPreset } from "./mtae-types";

const DATA_DIR = path.join(process.cwd(), "data");
const ASSESSMENTS_FILE = path.join(DATA_DIR, "mtae-assessments.json");
const CALIBRATIONS_FILE = path.join(DATA_DIR, "mtae-calibrations.json");
const MAPS_FILE = path.join(DATA_DIR, "mtae-timeframe-maps.json");

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

export async function getMtaeAssessments(): Promise<MtaeAssessment[]> {
  return readArrayFile<MtaeAssessment>(ASSESSMENTS_FILE);
}

export async function getMtaeAssessmentById(id: string): Promise<MtaeAssessment | undefined> {
  const needle = id.toUpperCase();
  const all = await getMtaeAssessments();
  return all.find((row) => row.id.toUpperCase() === needle);
}

export async function appendMtaeAssessment(row: MtaeAssessment): Promise<void> {
  const all = await getMtaeAssessments();
  all.push(row);
  all.sort((a, b) => a.id.localeCompare(b.id));
  await writeArrayFile(ASSESSMENTS_FILE, all);
}

export async function getMtaeCalibrations(): Promise<MtaeCalibration[]> {
  return readArrayFile<MtaeCalibration>(CALIBRATIONS_FILE);
}

export async function appendMtaeCalibration(row: MtaeCalibration): Promise<void> {
  const all = await getMtaeCalibrations();
  all.push(row);
  all.sort((a, b) => a.id.localeCompare(b.id));
  await writeArrayFile(CALIBRATIONS_FILE, all);
}

export async function getMtaeTimeframeMaps(): Promise<MtaeTimeframeMapPreset[]> {
  return readArrayFile<MtaeTimeframeMapPreset>(MAPS_FILE);
}

export function nextMtaeAssessmentId(rows: MtaeAssessment[], ticker: string): string {
  const normalized = ticker.trim().toUpperCase();
  const prefix = `MTAE-${normalized}-`;
  let max = 0;
  for (const row of rows) {
    if (!row.id.startsWith(prefix)) continue;
    const n = Number(row.id.slice(prefix.length));
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function nextMtaeCalibrationId(rows: MtaeCalibration[], ticker: string): string {
  const normalized = ticker.trim().toUpperCase();
  const prefix = `MTAEC-${normalized}-`;
  let max = 0;
  for (const row of rows) {
    if (!row.id.startsWith(prefix)) continue;
    const n = Number(row.id.slice(prefix.length));
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}
