import type { ExternalPosition } from "../external-position-types";

export type ExternalPositionsStoreMode = "supabase" | "json" | "memory";

export type ExternalPositionsStore = {
  readAll(): Promise<ExternalPosition[]>;
  upsert(row: ExternalPosition): Promise<ExternalPosition>;
  /**
   * Conditional write for concurrency.
   * Fails if stored revision !== expectedRevision.
   */
  upsertIfRevision(
    row: ExternalPosition,
    expectedRevision: number
  ): Promise<ExternalPosition>;
};
