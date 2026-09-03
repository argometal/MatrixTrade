/**
 * Client-safe MAF evidence source label (no fs / store imports).
 * Mirrors Matrix store gate used by maf-experiments-store for Insights display.
 */

import type { MafEvidenceSource } from "./insights-case-spine-types";

export function resolveMafEvidenceSource(): MafEvidenceSource {
  const forced = process.env.MAF_EXPERIMENTS_STORE?.trim().toLowerCase();
  if (forced === "supabase") return "supabase";
  if (forced === "json" || forced === "memory") return "local_json";

  const trades = process.env.TRADES_STORE?.trim().toLowerCase();
  if (trades === "supabase" || trades === "supabase-readonly") {
    return "supabase";
  }

  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return "supabase";
  }

  return "local_json";
}
