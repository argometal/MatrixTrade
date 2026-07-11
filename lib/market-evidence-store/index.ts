import { createJsonMarketEvidenceStore } from "./json";
import type { MarketEvidenceStore } from "./types";

let store: MarketEvidenceStore | null = null;

export function getMarketEvidenceStore(): MarketEvidenceStore {
  if (!store) store = createJsonMarketEvidenceStore();
  return store;
}
