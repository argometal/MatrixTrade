import { isSupabaseMatrixStore } from "../trades-json";
import { createJsonAppliedImportStore } from "./json";
import { createSupabaseAppliedImportStore } from "./supabase";
import type { AppliedImportStore } from "./types";

export function getAppliedImportStore(): AppliedImportStore {
  if (isSupabaseMatrixStore()) {
    return createSupabaseAppliedImportStore();
  }
  return createJsonAppliedImportStore();
}

export type { AppliedImportRecord, AppliedImportResult } from "./types";
