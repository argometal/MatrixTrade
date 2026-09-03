import type { MafExperiment } from "../maf-types";

export type MafExperimentsStoreMode = "supabase" | "json" | "memory";

export interface MafExperimentsStore {
  readAll(): Promise<MafExperiment[]>;
  upsert(row: MafExperiment): Promise<void>;
}
