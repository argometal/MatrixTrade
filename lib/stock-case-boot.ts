import { buildMatrixMechanicsBrief } from "./matrix-mechanics-brief";
import { sampleAiBlock } from "./ai-block";

export const STOCK_CASE_BOOT_REQUEST = `Return ONE AI Block only — plain JSON or a single \`\`\`json fenced block.
Use straight ASCII double quotes only — never curly “smart” quotes.

Block type: stock-case-create

ARCHITECTURE — two layers in one block:
1. Stock Profile (slow dossier): ticker, style, currentHypothesis, levels{}, riskRules{}, historicalAnalysis[], optional thesis, optional notes (AI reasoning snapshot)
2. initialScout (optional tactical window): plannedEntry, stopPrice, targetPrice, supportLevel, validFrom, validUntil, thesis

historicalAnalysis[] rows are migrated to Evidence on Apply — one row per timeframe.
initialScout creates PLAN-xxx linked to the new profile (entry/stop/target/R:R).

Required: ticker, currentHypothesis, levels (primaryZone or majorSupport), riskRules { minimumRR, invalidation }
Optional: thesis, notes, historicalAnalysis[], initialScout, status

POST result to inboxUrl — human Apply in MatrixTrade /inbox.`;

export function buildStockCaseBootPackage(): string {
  const mechanics = buildMatrixMechanicsBrief();
  const sample = sampleAiBlock("stock-case-create");

  return [
    mechanics,
    "",
    "=== STOCK CASE BOOT — new suspect dossier ===",
    "",
    "Layer A — Stock Profile: zones, invalidation, multi-timeframe story (historicalAnalysis → Evidence)",
    "Layer B — initialScout (optional): entry, stop, target, window for this scout episode",
    "",
    "Discuss charts and thesis in this chat. When ready, return ONE stock-case-create block.",
    "",
    "Example:",
    sample,
    "",
    "=== REQUEST ===",
    STOCK_CASE_BOOT_REQUEST,
  ].join("\n");
}
