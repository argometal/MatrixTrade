import { promises as fs } from "fs";
import path from "path";
import type { ImprovementHypothesis } from "../improvement-hypothesis-types";
import type { ImprovementHypothesesStore } from "./types";

const FILE = path.join(process.cwd(), "data", "improvement-hypotheses.json");

/** Local-dev only. Never writable on Vercel (read-only /var/task). */
export function assertJsonImprovementHypothesisWritesAllowed(): void {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    throw new Error(
      "Improvement Hypothesis JSON store cannot write on Vercel (read-only filesystem). " +
        "Supabase table for improvement_hypotheses is not yet provisioned — keep local."
    );
  }
}

export async function readImprovementHypothesesJsonFile(): Promise<
  ImprovementHypothesis[]
> {
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    const parsed = JSON.parse(raw) as ImprovementHypothesis[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw err;
  }
}

export function createJsonImprovementHypothesesStore(): ImprovementHypothesesStore {
  return {
    readAll: readImprovementHypothesesJsonFile,
    async upsert(row) {
      assertJsonImprovementHypothesisWritesAllowed();
      const all = await readImprovementHypothesesJsonFile();
      const idx = all.findIndex(
        (x) => x.id.toUpperCase() === row.id.toUpperCase()
      );
      if (idx >= 0) all[idx] = row;
      else all.push(row);
      all.sort((a, b) => a.id.localeCompare(b.id));
      await fs.mkdir(path.dirname(FILE), { recursive: true });
      await fs.writeFile(FILE, `${JSON.stringify(all, null, 2)}\n`, "utf-8");
    },
  };
}

export const IMPROVEMENT_HYPOTHESES_JSON_PATH = FILE;
