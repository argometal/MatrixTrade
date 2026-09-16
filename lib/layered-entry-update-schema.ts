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
 * PLAN-015 exemplar weights under FILL EVIDENCE: INSUFFICIENT — illustrative only, NOT a global OLE default.
 */
export const INSUFFICIENT_EVIDENCE_PLAN015_EXEMPLAR = {
  label: "FILL EVIDENCE: INSUFFICIENT (PLAN-015 exemplar — not a universal distribution)",
  exemplarPlanId: "PLAN-015",
  layerCount: 3,
  weights: [
    { price: 325, role: "starter", allocationPercent: 30 },
    { price: 323, role: "preferred", allocationPercent: 40 },
    { price: 320, role: "deep_pullback", allocationPercent: 30 },
  ],
  notes: [
    "These percentages apply to the PLAN-015 insufficient-evidence case only.",
    "When evidence is insufficient, distribute authorized risk reasonably across defensible layers — no fixed mandatory split.",
    "Do not label uncertainty-distributed layering as statistically optimized.",
    "Do not fabricate fill probabilities, chase above starter, or widen outside the technical zone.",
    "Distinguish EVIDENCE-SUPPORTED OLE from UNCERTAINTY-DISTRIBUTED OLE.",
  ],
} as const;

/** @deprecated Use INSUFFICIENT_EVIDENCE_PLAN015_EXEMPLAR — kept for import stability during 15-35. */
export const INSUFFICIENT_EVIDENCE_OLE_DEFAULT_WEIGHTS = INSUFFICIENT_EVIDENCE_PLAN015_EXEMPLAR;

/** Generic methodology narrative — percentages are illustrative, not product rules. */
export const OLE_EVIDENCE_SUPPORTED_METHODOLOGY = [
  "=== EVIDENCE-SUPPORTED OLE (methodology example — illustrative) ===",
  "Use when technical/historical evidence genuinely differentiates layers inside one defensible zone.",
  "Generic pattern (fictional levels — adapt to the Plan's zone):",
  "  · Starter $218 — prior breakout retest; evidence: high touch count but worst R if stop is $210.",
  "    Risk weight LOWER (e.g. 20% of authorized risk) — participation likely, expectancy modest.",
  "  · Preferred $212 — volume shelf + prior swing cluster; evidence: best historical reaction in this playbook family.",
  "    Risk weight HIGHER (e.g. 55%) — evidence ranks this as the primary battle entry.",
  "  · Deep $206 — structural support edge; evidence: highest R but weaker fill history on comparable cases.",
  "    Risk weight MODERATE (e.g. 25%) — keep meaningful participation without pretending fill is likely.",
  "Why each price exists: map to observable structure (shelf, retest, prior low) — not round numbers.",
  "Why weights differ: evidence ranks relative expectancy / fill tradeoff per layer — NOT a global template.",
  "Apply JSON still uses limits[].price + allocationPercent (sum 100) + authorizedRiskAmount + commonStopPrice.",
  "Human legend (below) translates allocationPercent × authorizedRisk into shares per layer.",
  "Percentages in this example (20/55/25) are illustrative — evidence-supported plans may use any defensible split.",
].join("\n");

export const OLE_INSUFFICIENT_EVIDENCE_METHODOLOGY = [
  "=== FILL EVIDENCE: INSUFFICIENT (methodology — not a default distribution) ===",
  "When the defensible zone is known but relative layer ranking is NOT evidenced:",
  "  1) Identify the defensible technical zone (do not widen for R).",
  "  2) Acknowledge insufficient evidence to rank exact entries inside the zone.",
  "  3) Distribute authorized risk REASONABLY across defensible layers — any split summing to 100% is valid.",
  "  4) Avoid false precision (e.g. pretending one price is statistically optimal).",
  "  5) Document reasoning in rationale / uncertaintyNote — do not claim optimization.",
  "No fixed percentage distribution is mandatory.",
  "PLAN-015 (AVGO-style) is the canonical insufficient-evidence exemplar in this contract (see below).",
].join("\n");

export const OLE_HUMAN_READABLE_LEGEND = [
  "=== HUMAN-READABLE OLE LEGEND (execution explanation — not extra Apply fields) ===",
  "Whenever enough information exists, explain the ladder for humans as:",
  '  "X shares at $Y" per layer, plus:',
  "  · risk allocated per layer ($)",
  "  · total planned risk (authorizedRiskAmount)",
  "  · full-fill average entry (weighted by shares)",
  "  · full-fill reward and blended R:R when commonStopPrice + primaryTargetPrice are known",
  "Derivation (risk_percent + common stop):",
  "  layerRisk$ = authorizedRiskAmount × (allocationPercent / 100)",
  "  riskPerShare = limitPrice − commonStopPrice (must be > 0)",
  "  shares = floor(layerRisk$ / riskPerShare) — integer shares; total deployed risk may be slightly under budget.",
  "These share lines are documentation / legend — do NOT invent JSON keys for shares on layered-entry-update unless schema adds them later.",
].join("\n");

/** PLAN-015 insufficient-evidence exemplar — human execution legend (matches init JSON example). */
export const PLAN015_INSUFFICIENT_EXECUTION_LEGEND = [
  "=== INSUFFICIENT-EVIDENCE EXEMPLAR — PLAN-015 human execution legend ===",
  "Authorized risk: $100 · Common stop: $315 · Target: $370",
  "Layer split (PLAN-015 exemplar only — not a universal rule): 325 → 30% · 323 → 40% · 320 → 30%",
  "",
  "Executable sizing (common stop $315):",
  "  · $325 (30% → $30 risk): $30 / ($325−$315) = $30 / $10 = 3 shares",
  "  · $323 (40% → $40 risk): $40 / ($323−$315) = $40 / $8 = 5 shares",
  "  · $320 (30% → $30 risk): $30 / ($320−$315) = $30 / $5 = 6 shares",
  "",
  "If all layers fill:",
  "  · Total shares: 14",
  "  · Maximum planned risk: $100 (3×10 + 5×8 + 6×5)",
  "  · Average entry ≈ (3×325 + 5×323 + 6×320) / 14 ≈ $322.14",
  "  · Reward to $370 on 14 shares: 14 × ($370 − $322.14) ≈ $670",
  "  · Blended R:R ≈ $670 / $100 = 6.70R (full-fill scenario; unfilled layers reduce realized exposure)",
].join("\n");

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
    OLE_EVIDENCE_SUPPORTED_METHODOLOGY,
    "",
    OLE_INSUFFICIENT_EVIDENCE_METHODOLOGY,
    "",
    OLE_HUMAN_READABLE_LEGEND,
    "",
    PLAN015_INSUFFICIENT_EXECUTION_LEGEND,
    "",
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
    "FILL EVIDENCE: INSUFFICIENT — see methodology sections above (no universal percentage default).",
    "PLAN-015 initialize JSON (insufficient-evidence exemplar — no fills):",
    JSON.stringify(LAYERED_ENTRY_UPDATE_INIT_EXAMPLE, null, 2),
    "",
    "Fill-outcome example (only after real fills):",
    JSON.stringify(LAYERED_ENTRY_UPDATE_FILL_EXAMPLE, null, 2),
    "",
    "Also valid configure paths: decision-update.layeredEntry / scout-plan-create.layeredEntry.",
    "Prefer layered-entry-update initialize when the Scout Plan already exists and must not be duplicated.",
    "",
    "PLAN-015 insufficient-evidence exemplar weights (not a global default):",
    JSON.stringify(INSUFFICIENT_EVIDENCE_PLAN015_EXEMPLAR, null, 2),
  ].join("\n");
}
