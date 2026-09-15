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
 *
 * Canonical shape: proposal fields are FLAT (same names as LayeredEntryPlan).
 * Do NOT nest under proposal.layeredEntry on this block.
 */
import type { LayeredEntryStatus, LayerRole } from "./layered-entry-types";

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

/**
 * Canonical limits[] object keys accepted on configure/initialize.
 * Required per limit: price, allocationPercent. Others optional.
 * Do NOT send filled / fillPrice / filledQuantity / fillRecordedAt on initialize.
 */
export const LAYERED_ENTRY_UPDATE_LIMIT_KEYS = [
  "price",
  "allocationPercent",
  "role",
  "stopPrice",
  "rationale",
  "structuralBasis",
  "confidence",
  "uncertaintyNote",
  "riskWeightR",
  "id",
] as const;

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

export const LAYERED_ENTRY_UPDATE_EXECUTION_METHODS = [
  "single_limit",
  "layered_limits",
  "market",
] as const;

export const LAYERED_ENTRY_UPDATE_STOP_MODELS = ["common", "per_layer"] as const;

export const LAYERED_ENTRY_UPDATE_SIZING_MODES = [
  "position_percent",
  "risk_percent",
] as const;

export const LAYERED_ENTRY_UPDATE_EXECUTION_MODELS = [
  "standard_layered",
  "risk_weighted",
  "modified_kelly",
] as const;

export const LAYERED_ENTRY_UPDATE_ROLES = [
  "starter",
  "preferred",
  "preferred_pullback",
  "deep_pullback",
  "confirmation",
  "reclaim_confirmation",
  "custom",
  "base",
  "kelly_extension",
] as const satisfies readonly LayerRole[];

export const LAYERED_ENTRY_UPDATE_CONFIDENCES = ["low", "medium", "high"] as const;

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
    "Distinguish EVIDENCE-SUPPORTED OPTIMIZED LAYERING from UNCERTAINTY-DISTRIBUTED LAYERING.",
  ],
} as const;

/** AVGO-style target semantics example — initialize OLE on an existing Plan (no fills). */
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
      if (lim.fillRecordedAt !== undefined) {
        errors.push(
          `proposal.limits[${i}].fillRecordedAt must not be set on configure`
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
  } else {
    const hasIndex = proposal.filledThroughIndex !== undefined;
    const statusRaw = proposal.status;
    const hasStatus =
      statusRaw !== undefined &&
      statusRaw !== null &&
      String(statusRaw).trim() !== "";

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
    "Does NOT create a new Scout Plan. Does NOT create Trade / fills / accounting / capital reservation / MAF / Observation / realized P/L.",
    "Human Apply → Validate → Accept only. Auditable mutation.",
    "",
    "SEMANTICS:",
    "A) planId exists + layeredEntry exists + configure payload (limits[]) → replace/reauthorize (update).",
    "B) planId exists + layeredEntry missing + configure payload → INITIALIZE layeredEntry (status planned).",
    "C) planId unknown → reject.",
    "D) Never create a new Scout Plan implicitly.",
    "E) Fill mode (filledThroughIndex|status without limits[]) requires an existing layeredEntry.",
    "",
    "SHAPE: proposal fields are FLAT (canonical LayeredEntryPlan names).",
    "Do NOT nest under proposal.layeredEntry on this block (that nesting is for decision-update / scout-plan-create only).",
    "",
    "CONFIGURE / INITIALIZE (no fills have occurred):",
    "  Required: planId + limits[] (each limit needs price + allocationPercent; sum allocationPercent = 100).",
    `  Allowed proposal keys: ${LAYERED_ENTRY_UPDATE_CONFIGURE_KEYS.join(", ")}`,
    `  Allowed limits[] keys: ${LAYERED_ENTRY_UPDATE_LIMIT_KEYS.join(", ")}`,
    "  executionMethod optional (defaults layered_limits).",
    "  status must be planned or omitted (server authorizes as planned).",
    "  FORBIDDEN on initialize: filledThroughIndex, filled, fillPrice, filledQuantity, fillRecordedAt, fillPercent, averageEntry, status partial|full|missed.",
    "",
    "ENUMS:",
    `  status: ${LAYERED_ENTRY_UPDATE_STATUS.join(" | ")}`,
    `  configure status: ${LAYERED_ENTRY_UPDATE_CONFIGURE_STATUS.join(" | ")}`,
    `  executionMethod: ${LAYERED_ENTRY_UPDATE_EXECUTION_METHODS.join(" | ")}`,
    `  stopModel: ${LAYERED_ENTRY_UPDATE_STOP_MODELS.join(" | ")}`,
    `  sizingMode: ${LAYERED_ENTRY_UPDATE_SIZING_MODES.join(" | ")}`,
    `  executionModel: ${LAYERED_ENTRY_UPDATE_EXECUTION_MODELS.join(" | ")}`,
    `  limits[].role: ${LAYERED_ENTRY_UPDATE_ROLES.join(" | ")}`,
    `  limits[].confidence: ${LAYERED_ENTRY_UPDATE_CONFIDENCES.join(" | ")}`,
    "",
    "FILL / LIFECYCLE (existing layeredEntry only):",
    `  Allowed keys: ${LAYERED_ENTRY_UPDATE_FILL_KEYS.join(", ")}`,
    "  Required: planId + filledThroughIndex OR status",
    "  filledThroughIndex: integer >= -1 (0-based inclusive; -1 = none / missed)",
    "",
    "FILL EVIDENCE: INSUFFICIENT (methodology — uncertainty-distributed OLE):",
    "  When the defensible zone is known but relative layer expectancy is NOT evidenced,",
    "  use default weights 30% starter / 40% preferred / 30% deep_pullback.",
    "  This is UNCERTAINTY-DISTRIBUTED LAYERING — NOT statistically optimized.",
    "  Do not invent fill probabilities, concentrate risk without evidence, chase above starter,",
    "  widen outside the technical zone, or change the tactical stop to manufacture R.",
    "  AVGO 320–325 / stop 315 / target 370 currently belongs in this category.",
    "",
    "Canonical INITIALIZE example (PLAN-015 AVGO — no fills):",
    JSON.stringify(LAYERED_ENTRY_UPDATE_INIT_EXAMPLE, null, 2),
    "",
    "Fill-outcome example (only after real fills):",
    JSON.stringify(LAYERED_ENTRY_UPDATE_FILL_EXAMPLE, null, 2),
    "",
    "Also valid configure paths: decision-update.layeredEntry / scout-plan-create.layeredEntry.",
    "Prefer layered-entry-update initialize when the Scout Plan already exists and must not be duplicated.",
    "",
    "Insufficient-evidence default weights object:",
    JSON.stringify(INSUFFICIENT_EVIDENCE_OLE_DEFAULT_WEIGHTS, null, 2),
  ].join("\n");
}
