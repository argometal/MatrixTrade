import type { LearningOutcome } from "../learning-outcome-types";

export type LearningOutcomesStoreMode = "supabase" | "json" | "memory";

export type LearningOutcomesStore = {
  readAll(): Promise<LearningOutcome[]>;
  upsert(row: LearningOutcome): Promise<void>;
  upsertMany?(rows: LearningOutcome[]): Promise<void>;
};
