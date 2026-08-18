/**
 * layered-entry-update — fill/status mutation only.
 * Does not configure limits, stops, targets, or risk. Those belong on
 * scout-plan-create / decision-update.layeredEntry.
 */
import type { LayeredEntryStatus } from "./layered-entry-types";

export const LAYERED_ENTRY_UPDATE_ALLOWED_KEYS = [
  "planId",
  "filledThroughIndex",
  "status",
] as const;

/** Matches LayeredEntryStatus — the only values Apply accepts on this block. */
export const LAYERED_ENTRY_UPDATE_STATUS = [
  "planned",
  "partial",
  "full",
  "missed",
  "active",
  "cancelled",
] as const satisfies readonly LayeredEntryStatus[];

export type LayeredEntryUpdateStatus = (typeof LAYERED_ENTRY_UPDATE_STATUS)[number];

/** Planning / geometry keys — invalid on this mutation (configure elsewhere). */
export const LAYERED_ENTRY_UPDATE_FORBIDDEN_PLANNING_KEYS = [
  "authorizedRiskAmount",
  "limits",
  "sizingMode",
  "stopModel",
  "commonStopPrice",
  "primaryTargetPrice",
  "executionMethod",
  "layeredEntry",
  "plannedEntry",
  "stopPrice",
  "targetPrice",
  "allocationPercent",
  "plannedQuantity",
  "currency",
  "modifiedKelly",
  "executionModel",
  "noChase",
  "fillPercent",
  "averageEntry",
  "filled",
  "executionInstruction",
] as const;

export const LAYERED_ENTRY_UPDATE_FILL_EXAMPLE = {
  type: "layered-entry-update",
  source: "ai-block",
  proposal: {
    planId: "PLAN-002",
    filledThroughIndex: 1,
  },
} as const;

/**
 * Configure a layered ladder without recording fills.
 * This is NOT layered-entry-update — fill/status would invent execution progress.
 */
export const LAYERED_ENTRY_CONFIGURE_WITHOUT_FILL_EXAMPLE = {
  type: "decision-update",
  source: "ai-block",
  proposal: {
    planId: "PLAN-007",
    layeredEntry: {
      executionMethod: "layered_limits",
      stopModel: "common",
      sizingMode: "risk_percent",
      commonStopPrice: 294,
      primaryTargetPrice: 380,
      limits: [
        { price: 315, allocationPercent: 20, role: "starter" },
        { price: 310, allocationPercent: 50, role: "preferred" },
        { price: 305, allocationPercent: 30, role: "deep_pullback" },
      ],
    },
    executionInstruction:
      "Buy {qty} shares (20%) at $315. Buy {qty} shares (50%) at $310. Buy {qty} shares (30%) at $305. Use the common stop at $294 for the full position. Hold until the primary target at $380. Any layer not reached remains unfilled. Do not chase.",
  },
} as const;

export function listUnknownLayeredEntryUpdateKeys(
  proposal: Record<string, unknown>
): string[] {
  return Object.keys(proposal).filter(
    (k) =>
      !(LAYERED_ENTRY_UPDATE_ALLOWED_KEYS as readonly string[]).includes(k)
  );
}

function parseFilledThroughIndex(
  raw: unknown
): { ok: true; value: number } | { ok: false; error: string } {
  if (raw === null || raw === "") {
    return {
      ok: false,
      error: "proposal.filledThroughIndex must be an integer >= -1",
    };
  }
  if (typeof raw !== "number" && typeof raw !== "string") {
    return {
      ok: false,
      error: "proposal.filledThroughIndex must be an integer >= -1",
    };
  }
  const idx = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isInteger(idx) || idx < -1) {
    return {
      ok: false,
      error: "proposal.filledThroughIndex must be an integer >= -1",
    };
  }
  return { ok: true, value: idx };
}

export function validateLayeredEntryUpdateProposal(
  proposal: Record<string, unknown>
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const planId = String(proposal.planId ?? "").trim();
  if (!planId) errors.push("proposal.planId required");

  const unknown = listUnknownLayeredEntryUpdateKeys(proposal);
  if (unknown.length) {
    errors.push(
      `proposal has unknown keys (schema-first — do not invent fields): ${unknown.join(", ")}. Allowed: ${LAYERED_ENTRY_UPDATE_ALLOWED_KEYS.join(", ")}. Planning fields (authorizedRiskAmount, limits, sizingMode, stopModel, …) are not valid on layered-entry-update — use scout-plan-create or decision-update.layeredEntry.`
    );
  }

  const hasIndex = proposal.filledThroughIndex !== undefined;
  const statusRaw = proposal.status;
  const hasStatus =
    statusRaw !== undefined &&
    statusRaw !== null &&
    String(statusRaw).trim() !== "";

  if (hasIndex) {
    const parsed = parseFilledThroughIndex(proposal.filledThroughIndex);
    if (!parsed.ok) errors.push(parsed.error);
  }
  if (hasStatus) {
    const status = String(statusRaw).trim();
    if (
      !(LAYERED_ENTRY_UPDATE_STATUS as readonly string[]).includes(status)
    ) {
      errors.push(
        `proposal.status must be one of: ${LAYERED_ENTRY_UPDATE_STATUS.join(", ")}`
      );
    }
  }
  if (!hasIndex && !hasStatus) {
    errors.push("proposal.filledThroughIndex or proposal.status required");
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true };
}

export function buildLayeredEntryUpdateContractText(): string {
  return [
    "=== LAYERED-ENTRY-UPDATE ===",
    "Fill / lifecycle mutation on an EXISTING Scout Plan that already has layeredEntry.",
    "Does NOT create a plan. Does NOT configure prices, allocations, stops, targets, or risk.",
    "Does NOT change Stock File thesis. Human Apply only.",
    "",
    "Required:",
    "- planId",
    "- filledThroughIndex OR status (at least one)",
    `Allowed proposal keys ONLY: ${LAYERED_ENTRY_UPDATE_ALLOWED_KEYS.join(", ")}`,
    "",
    "filledThroughIndex (integer, 0-based, inclusive):",
    "- Must be an integer >= -1",
    "- -1 = no layer filled (derived status missed; no chase)",
    "- 0 = limits[0] filled only (first layer)",
    "- k = limits[0] through limits[k] filled inclusive",
    "- k = last layer index (limits.length - 1) → all filled (derived status full)",
    "- 0 <= k < last index → derived status partial",
    "- Do not send k > last index; Apply would treat every layer as filled (status full)",
    "- If both filledThroughIndex and status are sent, filledThroughIndex is authoritative and derives status (missed|partial|full)",
    "- This field records execution progress. Omit it unless fills actually occurred.",
    "",
    `status enum: ${LAYERED_ENTRY_UPDATE_STATUS.join(" | ")}`,
    "- planned — authorized ladder, no fills (initial state after configure; not how you configure the ladder)",
    "- partial — some but not all layers filled (prefer filledThroughIndex so Matrix knows which)",
    "- full — all layers filled (prefer filledThroughIndex = last index)",
    "- missed — none filled; no chase (equivalent to filledThroughIndex: -1; clears filled flags)",
    "- active — execution armed / in progress (does not by itself mark which layers filled)",
    "- cancelled — cancelled (does not by itself mark which layers filled)",
    "- Status-only partial|full|active|cancelled changes lifecycle; it does not invent per-layer fill flags except status=missed (clears fills).",
    "- Transitions are enforced at Apply (e.g. missed and cancelled are terminal; cannot return to planned).",
    "",
    "INVALID on this block (configure elsewhere):",
    `  ${LAYERED_ENTRY_UPDATE_FORBIDDEN_PLANNING_KEYS.join(", ")}`,
    "",
    "Configure a layered entry WITHOUT marking execution progress:",
    "Use scout-plan-create (new PLAN) or decision-update (existing PLAN) with layeredEntry{}.",
    "Omit filledThroughIndex, filled, fillPercent, averageEntry, and status on that block.",
    "Matrix sets layeredEntry.status=planned after authorization.",
    "Canonical configure example (decision-update — not layered-entry-update):",
    JSON.stringify(LAYERED_ENTRY_CONFIGURE_WITHOUT_FILL_EXAMPLE, null, 2),
    "",
    "Fill-outcome example (this block — only after real fills):",
    JSON.stringify(LAYERED_ENTRY_UPDATE_FILL_EXAMPLE, null, 2),
    "Meaning: PLAN-002 already has a layered ladder; layers 0 and 1 filled; later layers remain unfilled.",
    "",
    "Missed / none filled example:",
    JSON.stringify(
      {
        type: "layered-entry-update",
        source: "ai-block",
        proposal: { planId: "PLAN-002", filledThroughIndex: -1 },
      },
      null,
      2
    ),
  ].join("\n");
}
