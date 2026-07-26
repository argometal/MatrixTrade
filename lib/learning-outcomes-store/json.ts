import { promises as fs } from "fs";
import path from "path";
import type { LearningOutcome } from "../learning-outcome-types";
import {
  resolveExistingLearningOutcome,
  resolveLearningOutcomeUpsert,
} from "./merge";
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

function findById(
  all: LearningOutcome[],
  id: string
): LearningOutcome | undefined {
  return all.find((x) => x.id.toUpperCase() === id.toUpperCase());
}

function findByBusinessIdentity(
  all: LearningOutcome[],
  row: LearningOutcome
): LearningOutcome | undefined {
  if (row.tradeId) {
    return all.find(
      (x) => x.tradeId?.toUpperCase() === row.tradeId!.toUpperCase()
    );
  }
  if (row.planId && !row.tradeId) {
    return all.find(
      (x) =>
        !x.tradeId &&
        x.planId?.toUpperCase() === row.planId!.toUpperCase()
    );
  }
  return undefined;
}

async function writeAll(all: LearningOutcome[]): Promise<void> {
  const file = learningOutcomesJsonPath();
  all.sort((a, b) => a.id.localeCompare(b.id));
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(all, null, 2)}\n`, "utf-8");
}

export function createJsonLearningOutcomesStore(): LearningOutcomesStore {
  return {
    readAll: readLearningOutcomesJsonFile,
    async upsert(row) {
      assertJsonLearningOutcomeWritesAllowed();
      const all = await readLearningOutcomesJsonFile();
      const existingById = findById(all, row.id);
      const existingByIdentity = findByBusinessIdentity(all, row);
      // Collision / target resolution before any file mutation.
      const target = resolveExistingLearningOutcome({
        incoming: row,
        existingById,
        existingByIdentity,
      });
      const resolved = resolveLearningOutcomeUpsert(target.existing, row);

      if (resolved.action === "insert") {
        all.push(resolved.row);
        await writeAll(all);
        return { ...resolved.row };
      }

      if (resolved.action === "skip") {
        return { ...resolved.row };
      }

      const idx = all.findIndex(
        (x) => x.id.toUpperCase() === resolved.row.id.toUpperCase()
      );
      if (idx >= 0) all[idx] = resolved.row;
      else all.push(resolved.row);
      await writeAll(all);
      return { ...resolved.row };
    },
    async upsertMany(rows) {
      const out: LearningOutcome[] = [];
      for (const row of rows) out.push(await this.upsert(row));
      return out;
    },
  };
}

export const LEARNING_OUTCOMES_JSON_PATH = path.join(
  process.cwd(),
  "data",
  "learning-outcomes.json"
);
