import { promises as fs } from "fs";
import path from "path";
import type { ObservationRecord } from "../observation-types";
import type { ObservationsStore } from "./types";

const FILE = path.join(process.cwd(), "data", "observations.json");

/** Local-dev only. Never writable on Vercel (read-only /var/task). */
export function assertJsonObservationWritesAllowed(): void {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    throw new Error(
      "Observation JSON store cannot write on Vercel (read-only filesystem). " +
        "Use Supabase public.observations — run supabase/observations.sql."
    );
  }
}

export async function readObservationsJsonFile(): Promise<ObservationRecord[]> {
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

function enforceUniqueAtomicUnit(
  all: ObservationRecord[],
  row: ObservationRecord
): void {
  if (row.tradeId) {
    const clash = all.find(
      (x) =>
        x.tradeId?.toUpperCase() === row.tradeId!.toUpperCase() &&
        x.id.toUpperCase() !== row.id.toUpperCase()
    );
    if (clash) {
      throw new Error(
        `Duplicate ObservationRecord for tradeId ${row.tradeId}: ${clash.id} vs ${row.id}`
      );
    }
  } else if (row.planId) {
    const clash = all.find(
      (x) =>
        !x.tradeId &&
        x.planId?.toUpperCase() === row.planId!.toUpperCase() &&
        x.id.toUpperCase() !== row.id.toUpperCase()
    );
    if (clash) {
      throw new Error(
        `Duplicate ObservationRecord for planId ${row.planId}: ${clash.id} vs ${row.id}`
      );
    }
  }
}

export function createJsonObservationsStore(): ObservationsStore {
  return {
    readAll: readObservationsJsonFile,
    async upsert(row) {
      assertJsonObservationWritesAllowed();
      const all = await readObservationsJsonFile();
      enforceUniqueAtomicUnit(all, row);
      const idx = all.findIndex((x) => x.id.toUpperCase() === row.id.toUpperCase());
      if (idx >= 0) all[idx] = row;
      else all.push(row);
      all.sort((a, b) => a.id.localeCompare(b.id));
      await fs.mkdir(path.dirname(FILE), { recursive: true });
      await fs.writeFile(FILE, `${JSON.stringify(all, null, 2)}\n`, "utf-8");
    },
  };
}

export const OBSERVATIONS_JSON_PATH = FILE;
