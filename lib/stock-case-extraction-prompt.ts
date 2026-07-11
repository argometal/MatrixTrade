import { sampleAiBlock } from "./ai-block";

/** Prompt for any external AI to extract a new Stock Profile from your research notes. */
export function buildStockCaseExtractionPrompt(notes?: string): string {
  const sample = sampleAiBlock("stock-case-create");

  return [
    "You are helping create a Stock Profile in MatrixTrade (expectation database, not a journal).",
    "Read the user's research below and return ONE JSON object only — no markdown fences.",
    "",
    "Required block type: stock-case-create",
    "",
    "Extract and normalize:",
    "- ticker (uppercase)",
    "- style (swing | position | day)",
    "- thesis (long-form strategy)",
    "- currentHypothesis (one tactical line — what we wait for now)",
    "- levels: majorSupport, majorResistance, primaryZone {low,high}, secondaryZone, targets[]",
    "- riskRules: minimumRR (number), invalidation (stop rule text), notes",
    "- historicalAnalysis[]: { timeframe, summary } per timeframe mentioned",
    "- status: draft | watching (default watching if setup is live)",
    "",
    "Rules:",
    "- Do not invent prices — use numbers from the notes or omit optional fields",
    "- invalidation = when the thesis is wrong (stop thesis, not just trade stop)",
    "- primaryZone = support / entry area; targets = upside levels",
    "- Use straight ASCII double quotes only in JSON — never curly “smart” quotes",
    "",
    "Example shape:",
    sample,
    "",
    notes ? "--- USER RESEARCH ---" : "",
    notes?.trim() ?? "(paste your AI research, chart notes, or thesis draft here)",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
