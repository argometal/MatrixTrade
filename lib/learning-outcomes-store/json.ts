import { promises as fs } from "fs";
import path from "path";
import type { LearningOutcome } from "../learning-outcome-types";
import type { LearningOutcomesStore } from "./types";

function learningOutcomesJsonPath(): string {
  return path.join(process.cwd(), "data", "learning-outcomes.json");
}

/** Local-dev only. Never writable on Vercel (read-only /var/task). */
export function assertJsonLearningOutcomeWritesAllowed(): void {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    throw new Error(
      "Learning Outcome JSON store cannot write on Vercel (read-only filesystem). " +
        "Use Supabase public.learning_outcomes — run supabase/learning-outcomes.sql."
    );
  }
}

export async function readLearningOutcomesJsonFile(): Promise<LearningOutcome[]> {
  try {
    const raw = await fs.readFile(learningOutcomesJsonPath(), "utf-8");
    const parsed = JSON.parse(raw) as LearningOutcome[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw err;
  }
}

function enforceCanonicalUniqueness(
  all: LearningOutcome[],
  row: LearningOutcome
): void {
  if (row.tradeId) {
    const clash = all.find(
      (x) =>
        x.tradeId?.toUpperCase() === row.tradeId!.toUpperCase() &&
        x.id.toUpperCase() !== row.id.toUpperCase()
    );
    if (clash) {
      throw new Error(
        `Duplicate Learning Outcome for tradeId ${row.tradeId}: ${clash.id} vs ${row.id}`
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
        `Duplicate Learning Outcome for planId ${row.planId}: ${clash.id} vs ${row.id}`
      );
    }
  }
}

export function createJsonLearningOutcomesStore(): LearningOutcomesStore {
  return {
    readAll: readLearningOutcomesJsonFile,
    async upsert(row) {
      assertJsonLearningOutcomeWritesAllowed();
      const file = learningOutcomesJsonPath();
      const all = await readLearningOutcomesJsonFile();
      enforceCanonicalUniqueness(all, row);
      const idx = all.findIndex((x) => x.id.toUpperCase() === row.id.toUpperCase());
      if (idx >= 0) all[idx] = row;
      else all.push(row);
      all.sort((a, b) => a.id.localeCompare(b.id));
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, `${JSON.stringify(all, null, 2)}\n`, "utf-8");
    },
    async upsertMany(rows) {
      assertJsonLearningOutcomeWritesAllowed();
      const file = learningOutcomesJsonPath();
      const all = await readLearningOutcomesJsonFile();
      for (const row of rows) {
        enforceCanonicalUniqueness(all, row);
        const idx = all.findIndex((x) => x.id.toUpperCase() === row.id.toUpperCase());
        if (idx >= 0) all[idx] = row;
        else all.push(row);
      }
      all.sort((a, b) => a.id.localeCompare(b.id));
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, `${JSON.stringify(all, null, 2)}\n`, "utf-8");
    },
  };
}

export const LEARNING_OUTCOMES_JSON_PATH = path.join(
  process.cwd(),
  "data",
  "learning-outcomes.json"
);
