/**
 * Plan Map execution instruction — AI explanation layer only.
 *
 * Wording is authored by external AI (Apply proposal). Matrix never
 * invents prices, shares, risk, or allocations, and never regenerates
 * this text from a deterministic template.
 *
 * Does not feed Matrix calculations, sizing, or persistence of
 * structured execution fields (layeredEntry / entry / stop / target).
 */

import type { TradePlan } from "./plan-types";

/** Max length for a concise PM-style operational instruction. */
export const EXECUTION_INSTRUCTION_MAX_CHARS = 1200;

/**
 * Normalize AI-authored execution instruction for persistence / display.
 * Empty or whitespace-only → undefined. Never synthesizes content.
 */
export function normalizeExecutionInstruction(
  value: unknown
): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  if (text.length > EXECUTION_INSTRUCTION_MAX_CHARS) {
    return text.slice(0, EXECUTION_INSTRUCTION_MAX_CHARS).trim();
  }
  return text;
}

/** Resolve Plan Map sentence from persisted AI text only. */
export function resolvePlanMapExecutionInstruction(
  plan: Pick<TradePlan, "executionInstruction"> | undefined
): string | undefined {
  return normalizeExecutionInstruction(plan?.executionInstruction);
}

/** Snapshot / brief guidance for external AI authors. */
export function formatExecutionInstructionGuidance(): string {
  return [
    "=== EXECUTION INSTRUCTION (Plan Map sentence) ===",
    "AI explanation layer only — not a calculation source; never invent prices, shares, risk, or allocations.",
    "When proposing scout-plan-create or decision-update with actionable execution geometry, include proposal.executionInstruction:",
    "a concise operational instruction for the human trader (experienced PM tone).",
    "Use only facts already in the Scout Plan context (layers, allocation, risk, stops, targets, OA, playbook, notes).",
    "Omit unavailable facts. Do not summarize the Plan Map cards — write how to execute.",
    "Matrix displays this string under the Plan Map header as-is; it does not template-generate it.",
  ].join("\n");
}

export function formatExecutionInstructionSection(
  plan: Pick<TradePlan, "executionInstruction">
): string | undefined {
  const text = resolvePlanMapExecutionInstruction(plan);
  if (!text) return undefined;
  return ["=== EXECUTION INSTRUCTION (current) ===", text].join("\n");
}
