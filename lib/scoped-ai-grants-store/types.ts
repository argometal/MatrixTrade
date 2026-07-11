import type { ScopedAiGrant } from "../scoped-ai-grant-types";

export interface ScopedAiGrantsStore {
  readAll(): Promise<ScopedAiGrant[]>;
  upsert(grant: ScopedAiGrant): Promise<void>;
  getById(id: string): Promise<ScopedAiGrant | undefined>;
}
