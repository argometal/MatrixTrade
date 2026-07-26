import type { ExternalPosition } from "../external-position-types";

export type ExternalPositionsStoreMode = "supabase" | "json" | "memory";

export type ExternalPositionsStore = {
  readAll(): Promise<ExternalPosition[]>;
  upsert(row: ExternalPosition): Promise<ExternalPosition>;
};
