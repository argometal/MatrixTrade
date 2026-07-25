import { promises as fs } from "fs";
import path from "path";
import type { LearningOutcome } from "../learning-outcome-types";
import { resolveLearningOutcomeUpsert } from "./merge";
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

function findCanonical(
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

function findExisting(
  all: LearningOutcome[],
  row: LearningOutcome
): LearningOutcome | undefined {
  const byIdentity = findCanonical(all, row);
  if (byIdentity) return byIdentity;
  return all.find((x) => x.id.toUpperCase() === row.id.toUpperCase());
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
      const existing = findExisting(all, row);
      const resolved = resolveLearningOutcomeUpsert(existing, row);

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

      for (let i = all.length - 1; i >= 0; i--) {
        if (
          all[i].id.toUpperCase() === row.id.toUpperCase() &&
          all[i].id.toUpperCase() !== resolved.row.id.toUpperCase()
        ) {
          all.splice(i, 1);
        }
      }
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
