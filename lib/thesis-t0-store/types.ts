import type { ThesisT0Freeze } from "../thesis-t0-types";

export type ThesisT0StoreMode = "json" | "memory" | "supabase";

export interface ThesisT0Store {
  readAll(): Promise<ThesisT0Freeze[]>;
  getById(id: string): Promise<ThesisT0Freeze | null>;
  findOpenByStockThesisId(stockThesisId: string): Promise<ThesisT0Freeze | null>;
  insert(row: ThesisT0Freeze): Promise<void>;
  upsert(row: ThesisT0Freeze): Promise<void>;
}
