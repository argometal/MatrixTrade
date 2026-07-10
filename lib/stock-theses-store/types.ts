import type { StockThesis } from "../stock-thesis-types";

export interface StockThesesStore {
  readAll(): Promise<StockThesis[]>;
  upsert(thesis: StockThesis): Promise<void>;
  upsertMany(theses: StockThesis[]): Promise<void>;
}
