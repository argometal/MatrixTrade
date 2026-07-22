import { buildMatrixMechanicsBrief } from "./matrix-mechanics-brief";
import { sampleAiBlock } from "./ai-block";
import { buildApplySchemaContractText } from "./apply-schema-contract";

export const STOCK_CASE_BOOT_REQUEST = [
  "Return ONE AI Block only — plain JSON or a single ```json fenced block.",
  "Use straight ASCII double quotes only — never curly “smart” quotes.",
  "",
  "Block type: stock-case-create",
  "",
  "SCHEMA-FIRST:",
  "- Read the MtA Apply Schema Contract before serializing.",
  "- Never invent keys (no primarySupportZone, probableTarget, technicalNotes, etc.).",
  "- Use only allowed levels keys: majorSupport, majorResistance, primaryZone, secondaryZone, targets.",
  '- riskRules.invalidation must be an observable EVENT string (e.g. "Weekly close below 130"), not a bare price.',
  "",
  "ARCHITECTURE — two layers in one block (both required):",
  "1. Stock Profile (slow dossier): ticker, style, currentHypothesis, levels{}, riskRules{}, historicalAnalysis[], optional thesis, optional notes",
  "2. initialScout (REQUIRED tactical window): plannedEntry, stopPrice, targetPrice (mandatory); optional supportLevel, validFrom, validUntil, thesis",
  "",
  "Creation without plannedEntry + stopPrice + targetPrice is REJECTED.",
  "",
  "historicalAnalysis[] rows migrate to Evidence on Apply.",
  "initialScout creates PLAN-xxx linked to the new profile.",
  "",
  "Required: ticker, currentHypothesis, levels, riskRules { minimumRR, invalidation }, initialScout { plannedEntry, stopPrice, targetPrice }",
  "Optional: thesis, notes, historicalAnalysis[], status",
  "",
  "Separate conceptual analysis from serialization. Keep Scout entry/stop/target distinct from Stock File zones and structural targets.",
  "",
  "POST result to inboxUrl — human Apply in MtA /inbox.",
].join("\n");

export function buildStockCaseBootPackage(): string {
  const mechanics = buildMatrixMechanicsBrief();
  const sample = sampleAiBlock("stock-case-create");
  const schema = buildApplySchemaContractText();

  return [
    mechanics,
    "",
    schema,
    "",
    "=== STOCK CASE BOOT — new suspect dossier ===",
    "",
    "Layer A — Stock Profile: zones, invalidation EVENT, multi-timeframe story (historicalAnalysis → Evidence)",
    "Layer B — initialScout (REQUIRED): plannedEntry + stopPrice + targetPrice for this scout episode",
    "",
    "Discuss charts and thesis first as CONCEPTUAL analysis (zones, invalidation event, scout candidate).",
    "Only then serialize to the exact stock-case-create schema — never invent keys.",
    "",
    "Example:",
    sample,
    "",
    "=== REQUEST ===",
    STOCK_CASE_BOOT_REQUEST,
  ].join("\n");
}
