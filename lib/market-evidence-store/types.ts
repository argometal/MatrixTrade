import type { MarketEvidence } from "../market-evidence-types";

export interface MarketEvidenceStore {
  readAll(): Promise<MarketEvidence[]>;
  append(evidence: MarketEvidence): Promise<void>;
  upsert(evidence: MarketEvidence): Promise<void>;
}
