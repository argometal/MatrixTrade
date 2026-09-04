import type { ImprovementHypothesis } from "../improvement-hypothesis-types";

export type ImprovementHypothesesStoreMode = "json" | "memory" | "supabase";

export type ImprovementHypothesesStore = {
  readAll(): Promise<ImprovementHypothesis[]>;
  upsert(row: ImprovementHypothesis): Promise<void>;
};
