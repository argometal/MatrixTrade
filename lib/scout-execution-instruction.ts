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

export const EXECUTION_INSTRUCTION_REQUIRED_MSG =
  "executionInstruction required when execution geometry is present or changed — AI-authored Plan Map operational instruction; never invent prices/shares/risk";

/** Fields that mutate Scout execution geometry (actionable plan). */
export const EXECUTION_GEOMETRY_FIELDS = [
  "plannedEntry",
  "stopPrice",
  "targetPrice",
  "layeredEntry",
] as const;

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

/** True when the proposal creates or mutates execution geometry. */
export function proposalMutatesExecutionGeometry(
  proposal: Record<string, unknown>
): boolean {
  return EXECUTION_GEOMETRY_FIELDS.some((field) => proposal[field] !== undefined);
}

/**
 * Schema-gate helper: actionable geometry requires non-empty executionInstruction.
 * Returns an error string or undefined when OK.
 */
export function requireExecutionInstructionForGeometry(
  proposal: Record<string, unknown>,
  opts?: { always?: boolean }
): string | undefined {
  const mustHave =
    opts?.always === true || proposalMutatesExecutionGeometry(proposal);
  if (!mustHave) return undefined;
  if (!normalizeExecutionInstruction(proposal.executionInstruction)) {
    return EXECUTION_INSTRUCTION_REQUIRED_MSG;
  }
  return undefined;
}

/** Snapshot / brief guidance for external AI authors. */
export function formatExecutionInstructionGuidance(): string {
  return [
    "=== EXECUTION INSTRUCTION (Plan Map sentence) ===",
    "Canonical spec: md/matrix/execution-instruction-spec.md",
    "AI explanation layer only — not a calculation source; never invent prices, shares, risk, or allocations.",
    "REQUIRED on scout-plan-create and on decision-update that changes execution geometry (plannedEntry, stopPrice, targetPrice, layeredEntry).",
    "Omit unavailable facts. Do not summarize Plan Map cards — write how to execute (PM / desk tone).",
    "Matrix displays this string under the Plan Map header as-is; it does not template-generate it.",
    "Apply rejects actionable proposals missing executionInstruction (schema Validate).",
  ].join("\n");
}

export function formatExecutionInstructionSection(
  plan: Pick<TradePlan, "executionInstruction">
): string | undefined {
  const text = resolvePlanMapExecutionInstruction(plan);
  if (!text) return undefined;
  return ["=== EXECUTION INSTRUCTION (current) ===", text].join("\n");
}
