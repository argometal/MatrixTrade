/**
 * Learning Outcome persistence facade.
 * Durable backend: Supabase `public.learning_outcomes` when Matrix store is cloud/Vercel.
 * Local JSON only off-Vercel — never write learning-outcomes.json in production.
 */
import {
  getLearningOutcomesStore,
  __setLearningOutcomesStoreForTests,
  LEARNING_OUTCOMES_JSON_PATH,
} from "./learning-outcomes-store";
import type { LearningOutcome } from "./learning-outcome-types";
import type { LearningOutcomesStore } from "./learning-outcomes-store/types";

export { LEARNING_OUTCOMES_JSON_PATH };

export async function getLearningOutcomes(): Promise<LearningOutcome[]> {
  return getLearningOutcomesStore().readAll();
}

export async function getLearningOutcomeById(
  id: string
): Promise<LearningOutcome | undefined> {
  const needle = id.toUpperCase();
  return (await getLearningOutcomes()).find(
    (row) => row.id.toUpperCase() === needle
  );
}

export async function getLearningOutcomeByTradeId(
  tradeId: string
): Promise<LearningOutcome | undefined> {
  const needle = tradeId.toUpperCase();
  return (await getLearningOutcomes()).find(
    (row) => row.tradeId?.toUpperCase() === needle
  );
}

export async function getLearningOutcomeByPlanId(
  planId: string
): Promise<LearningOutcome | undefined> {
  const needle = planId.toUpperCase();
  return (await getLearningOutcomes()).find(
    (row) => row.planId?.toUpperCase() === needle && !row.tradeId
  );
}

export async function upsertLearningOutcome(
  row: LearningOutcome
): Promise<LearningOutcome> {
  return getLearningOutcomesStore().upsert(row);
}

export function nextLearningOutcomeId(
  rows: LearningOutcome[],
  ticker: string
): string {
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

/**
 * Backward-compatible test override.
 * Accepts seed array (legacy), a store instance, or null to clear.
 */
export function __setLearningOutcomeStoreForTests(
  seedOrStore: LearningOutcome[] | LearningOutcomesStore | null
): void {
  __setLearningOutcomesStoreForTests(seedOrStore);
}
