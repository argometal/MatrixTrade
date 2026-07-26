import type { LearningOutcome } from "../learning-outcome-types";

export type LearningOutcomesStoreMode = "supabase" | "json" | "memory";

export type LearningOutcomesStore = {
  readAll(): Promise<LearningOutcome[]>;
  /** Persist and return the canonical row (may differ in id after identity conflict). */
  upsert(row: LearningOutcome): Promise<LearningOutcome>;
  upsertMany?(rows: LearningOutcome[]): Promise<LearningOutcome[]>;
};
