/**
 * Apply JSON paste discipline — prompt/contract only.
 * Does not change the parser. Surrounding prose still fails Control → Apply.
 */

export const APPLY_JSON_PASTE_RULES = [
  "When Apply JSON is requested, deliver one JSON object as the directly copyable payload.",
  "The human copies only from the opening { through the matching } into Control → Apply.",
  "Never include explanation, introduction, conclusion, Prompt IDs, block IDs, extra Markdown, or comments in that paste payload.",
  "Do not wrap the payload in ``` fences, headings, or commentary — the paste is the object itself.",
  "JSON comments (// or /* */) are invalid. Use straight ASCII double quotes only.",
  "If analysis is needed, put it in a separate message. Never mix it into the Apply paste.",
] as const;

export const LAYERED_ENTRY_EXECUTION_INSTRUCTION_RULES = [
  "AI writes share quantities in executionInstruction (operational prose for the trader).",
  "allocationPercent on limits[] is the structural distribution — keep it; do not replace % with shares in JSON.",
  "Do not send plannedQuantity (or derived) in the Apply JSON — Matrix computes persisted quantities.",
  "Example executionInstruction: Buy 1 share at $315. Buy 2 shares at $310. Buy 2 shares at $305.",
] as const;

export const LAYERED_ENTRY_SHARE_INSTRUCTION_EXAMPLE =
  "Buy 1 share at $315. Buy 2 shares at $310. Buy 2 shares at $305.";

export function buildApplyJsonPasteDisciplineText(): string {
  return [
    "=== APPLY JSON PASTE DISCIPLINE ===",
    "Control → Apply parses a JSON object. Surrounding chat text is rejected — do not work around the parser.",
    ...APPLY_JSON_PASTE_RULES.map((r) => `- ${r}`),
    "",
    "LAYERED ENTRY (configure via scout-plan-create or decision-update.layeredEntry):",
    ...LAYERED_ENTRY_EXECUTION_INSTRUCTION_RULES.map((r) => `- ${r}`),
  ].join("\n");
}
