import { appendMarketEvidence } from "./market-evidence";
import type { StockThesisHistoricalAnalysis } from "./stock-thesis-types";

export async function seedEvidenceFromHistoricalAnalysis(
  stockProfileId: string,
  ticker: string,
  rows: StockThesisHistoricalAnalysis[],
  defaultConfidence = 72
): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  for (const row of rows) {
    const result = await appendMarketEvidence({
      stockProfileId,
      ticker,
      timeframe: row.timeframe,
      category: "structure",
      value: row.summary,
      confidence: defaultConfidence,
      source: "migration",
      note: "Migrated from stock-case-create historicalAnalysis",
    });
    if (result.errors?.length) {
      errors.push(...result.errors);
      continue;
    }
    count += 1;
  }

  return { count, errors };
}
