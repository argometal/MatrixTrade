/**
 * layered-entry-update — create-or-update LayeredEntry on an EXISTING Scout Plan.
 *
 * Modes:
 * A) Configure / initialize — planId + limits[] (+ stop/target/risk fields).
 *    Creates layeredEntry when missing; replaces when present. status planned.
 * B) Fill / lifecycle — planId + filledThroughIndex and/or status.
 *    Requires an existing layeredEntry.
 *
 * Never creates a Scout Plan, Trade, fill accounting, MAF, or Observation.
 * Human Accept remains required (Apply mutation).
 */
import type { LayeredEntryStatus } from "./layered-entry-types";

/** Fill / lifecycle keys (mode B). */
export const LAYERED_ENTRY_UPDATE_FILL_KEYS = [
  "planId",
  "filledThroughIndex",
  "status",
] as const;

/**
 * Canonical configure/initialize keys on proposal (flat — not nested under layeredEntry).
 * Matches persisted LayeredEntryPlan field names; executionMethod defaults to layered_limits.
 */
export const LAYERED_ENTRY_UPDATE_CONFIGURE_KEYS = [
  "planId",
  "limits",
  "executionMethod",
  "stopModel",
  "sizingMode",
  "commonStopPrice",
  "primaryTargetPrice",
  "authorizedRiskAmount",
  "currency",
  "cancelConditions",
  "proposalSource",
  "executionModel",
  "modifiedKelly",
  "status",
] as const;

export const LAYERED_ENTRY_UPDATE_ALLOWED_KEYS = Array.from(
  new Set([
    ...LAYERED_ENTRY_UPDATE_FILL_KEYS,
    ...LAYERED_ENTRY_UPDATE_CONFIGURE_KEYS,
  ])
) as readonly string[];

/** Matches LayeredEntryStatus — fill/lifecycle path. */
export const LAYERED_ENTRY_UPDATE_STATUS = [
  "planned",
  "partial",
  "full",
  "missed",
  "active",
  "cancelled",
] as const satisfies readonly LayeredEntryStatus[];

/** Only planned (or omit → planned) is valid when initializing/configuring the ladder. */
export const LAYERED_ENTRY_UPDATE_CONFIGURE_STATUS = ["planned"] as const;

export type LayeredEntryUpdateStatus = (typeof LAYERED_ENTRY_UPDATE_STATUS)[number];

/**
 * Default uncertainty-management risk weights when FILL EVIDENCE: INSUFFICIENT.
 * Not a statistical claim that 30/40/30 is optimal — overridable when evidence supports otherwise.
 */
export const INSUFFICIENT_EVIDENCE_OLE_DEFAULT_WEIGHTS = {
  label: "FILL EVIDENCE: INSUFFICIENT",
  layerCount: 3,
  weights: [
    { role: "starter", allocationPercent: 30 },
    { role: "preferred", allocationPercent: 40 },
    { role: "deep_pullback", allocationPercent: 30 },
  ],
  notes: [
    "Uncertainty-management default when the defensible zone is known but relative layer expectancy is not.",
    "Do not label this as statistically optimized layering.",
    "Family B: starter remains <=30%; middle gets modest preference; deep layer keeps meaningful participation.",
    "Do not fabricate fill probabilities, chase above starter, or widen the ladder outside the technical zone.",
  ],
} as const;

/** AVGO-style target semantics example — initialize OLE on an existing Plan. */
export const LAYERED_ENTRY_UPDATE_INIT_EXAMPLE = {
  type: "layered-entry-update",
  source: "ai-block",
  proposal: {
    planId: "PLAN-015",
    authorizedRiskAmount: 100,
    sizingMode: "risk_percent",
    stopModel: "common",
    commonStopPrice: 315,
    primaryTargetPrice: 370,
    status: "planned",
    limits: [
      { price: 325, allocationPercent: 30, role: "starter" },
      { price: 323, allocationPercent: 40, role: "preferred" },
      { price: 320, allocationPercent: 30, role: "deep_pullback" },
    ],
  },
} as const;

export const LAYERED_ENTRY_UPDATE_FILL_EXAMPLE = {
  type: "layered-entry-update",
  source: "ai-block",
  proposal: {
    planId: "PLAN-002",
    filledThroughIndex: 1,
  },
} as const;

/**
 * Still valid: configure via decision-update.layeredEntry on an existing Plan.
 * layered-entry-update can now also initialize without a new Scout Plan.
 */
export const LAYERED_ENTRY_CONFIGURE_VIA_DECISION_UPDATE_EXAMPLE = {
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
        { price: 315, allocationPercent: 30, role: "starter" },
        { price: 310, allocationPercent: 40, role: "preferred" },
        { price: 305, allocationPercent: 30, role: "deep_pullback" },
      ],
    },
  },
} as const;

export function isLayeredEntryConfigureProposal(
  proposal: Record<string, unknown>
): boolean {
  return Array.isArray(proposal.limits) && proposal.limits.length > 0;
}

export function listUnknownLayeredEntryUpdateKeys(
  proposal: Record<string, unknown>
): string[] {
  return Object.keys(proposal).filter(
    (k) => !LAYERED_ENTRY_UPDATE_ALLOWED_KEYS.includes(k)
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

function hasFabricatedFillProgression(proposal: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (proposal.filledThroughIndex !== undefined) {
    errors.push(
      "proposal.filledThroughIndex is invalid when configuring/initializing layeredEntry — omit fill progression; use status planned (or omit)"
    );
  }
  if (proposal.fillPercent !== undefined) {
    errors.push("proposal.fillPercent is not valid on layered-entry-update configure");
  }
  if (proposal.averageEntry !== undefined) {
    errors.push("proposal.averageEntry is not valid on layered-entry-update configure");
  }
  const limits = proposal.limits;
  if (Array.isArray(limits)) {
    for (const [i, raw] of limits.entries()) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const lim = raw as Record<string, unknown>;
      if (lim.filled === true || lim.filled === "true") {
        errors.push(
          `proposal.limits[${i}].filled must not be set when initializing/configuring — do not fabricate fills`
        );
      }
      if (lim.fillPrice !== undefined || lim.filledQuantity !== undefined) {
        errors.push(
          `proposal.limits[${i}] must not include fillPrice/filledQuantity on configure`
        );
      }
    }
  }
  const statusRaw = proposal.status;
  if (statusRaw !== undefined && statusRaw !== null && String(statusRaw).trim() !== "") {
    const status = String(statusRaw).trim();
    if (
      !(LAYERED_ENTRY_UPDATE_CONFIGURE_STATUS as readonly string[]).includes(status)
    ) {
      errors.push(
        `proposal.status on configure/initialize must be "planned" (or omitted); got "${status}" — do not fabricate fill lifecycle`
      );
    }
  }
  return errors;
}

export function validateLayeredEntryUpdateProposal(
  proposal: Record<string, unknown>
): { ok: true; mode: "configure" | "fill" } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const planId = String(proposal.planId ?? "").trim();
  if (!planId) errors.push("proposal.planId required");

  const unknown = listUnknownLayeredEntryUpdateKeys(proposal);
  if (unknown.length) {
    errors.push(
      `proposal has unknown keys (schema-first — do not invent fields): ${unknown.join(", ")}. Allowed: ${LAYERED_ENTRY_UPDATE_ALLOWED_KEYS.join(", ")}`
    );
  }

  const configure = isLayeredEntryConfigureProposal(proposal);

  if (configure) {
    errors.push(...hasFabricatedFillProgression(proposal));
    // Structural validation of limits is done by parseLayeredEntryInput + validateLayeredEntry downstream.
  } else {
    const hasIndex = proposal.filledThroughIndex !== undefined;
    const statusRaw = proposal.status;
    const hasStatus =
      statusRaw !== undefined &&
      statusRaw !== null &&
      String(statusRaw).trim() !== "";

    // Planning keys without limits → incomplete configure attempt
    const planningWithoutLimits = (
      LAYERED_ENTRY_UPDATE_CONFIGURE_KEYS as readonly string[]
    ).filter(
      (k) =>
        k !== "planId" &&
        k !== "status" &&
        proposal[k] !== undefined
    );
    if (planningWithoutLimits.length) {
      errors.push(
        `proposal includes planning fields (${planningWithoutLimits.join(", ")}) without limits[] — supply limits[] to initialize/update layeredEntry, or use fill-only keys: planId, filledThroughIndex, status`
      );
    }

    if (hasIndex) {
      const parsed = parseFilledThroughIndex(proposal.filledThroughIndex);
      if (!parsed.ok) errors.push(parsed.error);
    }
    if (hasStatus) {
      const status = String(statusRaw).trim();
      if (!(LAYERED_ENTRY_UPDATE_STATUS as readonly string[]).includes(status)) {
        errors.push(
          `proposal.status must be one of: ${LAYERED_ENTRY_UPDATE_STATUS.join(", ")}`
        );
      }
    }
    if (!hasIndex && !hasStatus) {
      errors.push(
        "proposal.filledThroughIndex or proposal.status required (fill mode), or proposal.limits[] to initialize/update layeredEntry"
      );
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, mode: configure ? "configure" : "fill" };
}

export function buildLayeredEntryUpdateContractText(): string {
  return [
    "=== LAYERED-ENTRY-UPDATE ===",
    "Create-or-update LayeredEntry on an EXISTING Scout Plan (planId required).",
    "Does NOT create a new Scout Plan. Does NOT create Trade / fills / accounting / MAF / Observation / realized P/L.",
    "Human Apply → Validate → Accept only. Auditable mutation.",
    "",
    "TWO MODES:",
    "",
    "1) INITIALIZE / UPDATE ladder (configure) — when planId exists:",
    "   - No layeredEntry yet → initialize from valid payload (status planned).",
    "   - layeredEntry exists → replace/reauthorize from payload (idempotent when identical).",
    "   - planId missing → reject.",
    "   Required: planId + limits[] (allocationPercent sum 100).",
    "   Canonical proposal keys (flat on proposal — same names as LayeredEntryPlan):",
    `   ${LAYERED_ENTRY_UPDATE_CONFIGURE_KEYS.join(", ")}`,
    "   executionMethod optional (defaults layered_limits). status must be planned or omitted.",
    "   Do NOT send filledThroughIndex, filled flags, fillPrice, fillPercent, or partial|full|missed status — that fabricates execution.",
    "   FILL EVIDENCE: INSUFFICIENT → prefer uncertainty-distributed weights (default 30/40/30 starter/preferred/deep_pullback), not false-precision concentration.",
    "   Distinguish evidence-supported optimized layering from uncertainty-distributed layering — never label the latter as statistically optimized.",
    "",
    "Canonical initialize example:",
    JSON.stringify(LAYERED_ENTRY_UPDATE_INIT_EXAMPLE, null, 2),
    "",
    "2) FILL / LIFECYCLE — existing layeredEntry only:",
    "   Required: planId + filledThroughIndex OR status",
    `   Allowed fill keys: ${LAYERED_ENTRY_UPDATE_FILL_KEYS.join(", ")}`,
    "   filledThroughIndex: integer >= -1 (0-based inclusive; -1 = none / missed)",
    `   status enum: ${LAYERED_ENTRY_UPDATE_STATUS.join(" | ")}`,
    "",
    "Fill-outcome example:",
    JSON.stringify(LAYERED_ENTRY_UPDATE_FILL_EXAMPLE, null, 2),
    "",
    "Also still valid: decision-update.layeredEntry or scout-plan-create.layeredEntry for configure.",
    "Prefer layered-entry-update initialize when the Scout Plan already exists and must not be duplicated.",
    "",
    "Insufficient-evidence OLE default (methodology — not a hard schema enum):",
    JSON.stringify(INSUFFICIENT_EVIDENCE_OLE_DEFAULT_WEIGHTS, null, 2),
  ].join("\n");
}
