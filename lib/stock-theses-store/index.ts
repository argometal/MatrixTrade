import { createJsonStockThesesStore } from "./json";
import type { StockThesesStore } from "./types";

let cachedStore: StockThesesStore | null = null;

export function getStockThesesStore(): StockThesesStore {
  if (!cachedStore) {
    cachedStore = createJsonStockThesesStore();
  }
  return cachedStore;
}
