/**
 * Entry Solver — Mechanics + Scout advising (MXT 021 Entry Solver repair).
 *
 * Mandatory order:
 * Target → Stop → R Map → Participation → Entry
 *
 * Forbidden:
 * Zone → arbitrary price → post-hoc R justification
 *
 * Optimize executable participation under minimumRR — not maximum theoretical R.
 * Does not invent fill probabilities when sample is insufficient.
 */

export const ENTRY_SOLVER_PIPELINE =
  "Target → Stop → R Map → Participation → Entry" as const;

export type ProbableTargetKind =
  | "observed_structural"
  | "probable_operational"
  | "calculated_projection";

export type EntrySolverCandidate = {
  price: number;
  /** Label e.g. zone_high | zone_mid | zone_low | opportunity_1 | opportunity_2 */
  role: string;
  r: number | null;
  meetsMinimumRR: boolean;
};

export type FillEvidenceStatus = "insufficient" | "qualitative_only" | "sample_backed";

export type EntrySolverWorksheet = {
  probableTarget: number | null;
  probableTargetKind: ProbableTargetKind | null;
  /** Projection/reference levels that must NOT masquerade as probable target. */
  calculatedProjections: Array<{ label: string; price: number }>;
  tacticalStop: number | null;
  /** Stock File structural invalidation — distinct from tactical stop. */
  structuralInvalidationNote?: string | null;
  opportunityZone: { low: number; high: number } | null;
  minimumRR: number;
  maximumEntryCeiling: number | null;
  candidates: EntrySolverCandidate[];
  fillEvidenceStatus: FillEvidenceStatus;
  participationNote: string;
  selectedEntry: number | null;
  whySelected: string | null;
  alternativeDeeperOpportunity: string | null;
  reassessmentCondition: string | null;
  verdictHint: "wait" | "go" | "probe" | "no" | "needs_evidence";
  /** True when current price is above zone / chase risk. */
  priceExtended?: boolean;
};

export type EntrySolverValidation = {
  ok: boolean;
  errors: string[];
};

/** Long R = (target - entry) / (entry - stop). */
export function longRewardRiskR(
  entry: number,
  stop: number,
  target: number
): number | null {
  if (![entry, stop, target].every((n) => Number.isFinite(n))) return null;
  if (!(stop < entry && entry < target)) return null;
  const risk = entry - stop;
  if (!(risk > 0)) return null;
  return (target - entry) / risk;
}

/**
 * Feasibility ceiling — never the recommended entry.
 * maximumEntry = target - (minimumRR × (target - stop)) / (minimumRR + 1)
 */
export function computeMaximumEntryCeiling(
  target: number,
  stop: number,
  minimumRR: number
): number | null {
  if (![target, stop, minimumRR].every((n) => Number.isFinite(n))) return null;
  if (!(stop < target) || !(minimumRR > 0)) return null;
  return target - (minimumRR * (target - stop)) / (minimumRR + 1);
}

export function buildCandidateRMap(input: {
  prices: Array<{ price: number; role: string }>;
  stop: number;
  target: number;
  minimumRR: number;
}): EntrySolverCandidate[] {
  return input.prices.map(({ price, role }) => {
    const r = longRewardRiskR(price, input.stop, input.target);
    return {
      price,
      role,
      r,
      meetsMinimumRR: r != null && r + 1e-9 >= input.minimumRR,
    };
  });
}

/** Compact Mechanics copy — Control → MTA Mechanics → Entry Solver. */
export function buildEntrySolverMechanicsBrief(): string {
  return [
    "=== ENTRY SOLVER (Mechanics) ===",
    `Pipeline (mandatory): ${ENTRY_SOLVER_PIPELINE}`,
    'Optimize executable participation, not maximum theoretical R.',
    "",
    "ORDER",
    "1. PROBABLE TARGET — observed structural OR probable operational.",
    "   Calculated projections (Fib, measured move, etc.) are REFERENCE ONLY.",
    "   Never persist a projection as probable target without structural evidence.",
    "   If no defendable probable target: say so — do not fabricate definitive R.",
    "2. TACTICAL STOP — price/event that proves THIS setup/entry failed.",
    "   Distinct from Stock File structural invalidation (thesis death).",
    "3. R MAP — compute R across candidate prices in the opportunity zone.",
    "   Do NOT pick plannedEntry from zone aesthetics (midpoint, round number).",
    "   Forbidden: ZONE → arbitrary price → post-hoc R justification.",
    "4. MINIMUM R FILTER — drop candidates below riskRules.minimumRR.",
    "   maximumEntry = feasibility CEILING only — never auto-recommendedEntry.",
    "5. PARTICIPATION / FILL — among R-valid candidates, weigh participation cost.",
    "   Higher entry → lower R / greater fill likelihood.",
    "   Lower entry → higher R / lower fill likelihood.",
    "   MAX R ≠ OPTIMAL ENTRY.",
    "   If sample insufficient: FILL EVIDENCE: INSUFFICIENT (no invented %).",
    "   Reuse historical Cases / missed_opportunity / Possible Over-Optimization",
    "   when present — do not invent fill-rate statistics.",
    "6. ENTRY — select Optimized Entry only after 1–5 + R$ sizing context.",
    "   Conceptual quality: R quality × participation quality (structure, not fake fill %).",
    "   shares ≈ riskBudgetUsd / (entry − stop). riskPerShare ≠ 1R.",
    "7. DEEPER OPPORTUNITY — Opportunity 2 is a NEW market state.",
    "   Reassess structure/target/stop/playbook/thesis — never auto-execute for higher R.",
    "   Attempt 1 tactical stop ≈ −1R does not auto-invalidate Stock File thesis.",
    "8. NO-FILL — preserve plannedEntry, closest approach, whether setup worked,",
    "   and R at more participative candidates for learning — not a silent no-trade.",
    "",
    "SCOUT may emit plannedEntry/stop/target/plannedRR/verdict ONLY after this pipeline.",
    "To claim Optimized Entry on Apply: optimizedEntryClaim + entrySolver worksheet.",
    "Bare plannedEntry without claim = LEGACY / ENTRY SOLVER EVIDENCE MISSING — allowed, not labeled optimized.",
    "WHY THIS ENTRY must reconstruct: target → stop → R comparison → participation → entry → R$ shares.",
    "Reject explanations: inside support zone / good level / near support / better R alone.",
  ].join("\n");
}

export function formatEntrySolverAdviseSection(
  sheet: EntrySolverWorksheet
): string {
  const candLines =
    sheet.candidates.length === 0
      ? ["(none — build R map before selecting entry)"]
      : sheet.candidates.map((c) => {
          const rTxt = c.r == null ? "invalid" : `${c.r.toFixed(2)}R`;
          const gate = c.meetsMinimumRR ? "PASS_minRR" : "FAIL_minRR";
          return `- ${c.role} @ ${c.price}: ${rTxt} · ${gate}`;
        });

  const proj =
    sheet.calculatedProjections.length === 0
      ? "(none)"
      : sheet.calculatedProjections
          .map((p) => `${p.label}:${p.price} (REFERENCE — not probable target)`)
          .join(" | ");

  const maxE =
    sheet.maximumEntryCeiling != null
      ? sheet.maximumEntryCeiling.toFixed(4)
      : "na (need target+stop+minRR)";

  return [
    "=== ENTRY SOLVER ===",
    `pipeline:${ENTRY_SOLVER_PIPELINE}`,
    "objective: Optimize executable participation, not maximum theoretical R.",
    "",
    `Probable target: ${sheet.probableTarget ?? "UNDEFINED"} (${sheet.probableTargetKind ?? "none"})`,
    `Calculated projections (not targets): ${proj}`,
    `Tactical stop: ${sheet.tacticalStop ?? "UNDEFINED"}`,
    sheet.structuralInvalidationNote
      ? `Structural invalidation (Stock File — distinct): ${sheet.structuralInvalidationNote}`
      : null,
    sheet.opportunityZone
      ? `Opportunity zone: ${sheet.opportunityZone.low}–${sheet.opportunityZone.high}`
      : "Opportunity zone: UNDEFINED",
    `minimumRR: ${sheet.minimumRR}`,
    `maximumEntry (ceiling only): ${maxE}`,
    "Candidate entries / R:",
    ...candLines,
    `Participation evidence: FILL EVIDENCE: ${sheet.fillEvidenceStatus.toUpperCase()}`,
    `Participation note: ${sheet.participationNote}`,
    `Selected entry: ${sheet.selectedEntry ?? "NONE — NEEDS EVIDENCE / WAIT"}`,
    `Why selected: ${sheet.whySelected ?? "(not selected)"}`,
    `Alternative/deeper opportunity: ${sheet.alternativeDeeperOpportunity ?? "none stated"}`,
    `Reassessment condition: ${sheet.reassessmentCondition ?? "none stated"}`,
    `Verdict hint: ${sheet.verdictHint}`,
    sheet.priceExtended
      ? "NO CHASE: price extended above zone — WAIT while extended."
      : null,
  ]
    .filter((l): l is string => typeof l === "string")
    .join("\n");
}

/**
 * Validate a completed Scout-bound worksheet.
 * Fails closed if plannedEntry appears without pipeline evidence.
 */
export function validateEntrySolverForScout(input: {
  worksheet: EntrySolverWorksheet;
  plannedEntry?: number | null;
}): EntrySolverValidation {
  const errors: string[] = [];
  const w = input.worksheet;

  if (w.probableTarget == null || !Number.isFinite(w.probableTarget)) {
    errors.push("probable target required before plannedEntry");
  }
  if (w.probableTargetKind === "calculated_projection") {
    errors.push(
      "probable target cannot be calculated_projection alone — treat as reference until structurally defended"
    );
  }
  if (w.tacticalStop == null || !Number.isFinite(w.tacticalStop)) {
    errors.push("tactical stop required before plannedEntry");
  }
  if (w.candidates.length < 2) {
    errors.push("R map requires at least two candidate entries for comparison");
  }
  if (!w.candidates.some((c) => c.r != null)) {
    errors.push("R map has no valid R calculations");
  }
  if (!w.participationNote.trim()) {
    errors.push("participation consideration required");
  }
  if (
    w.fillEvidenceStatus === "sample_backed" &&
    /insufficient/i.test(w.participationNote)
  ) {
    errors.push("fillEvidenceStatus sample_backed contradicts insufficient note");
  }

  const planned = input.plannedEntry ?? w.selectedEntry;
  if (planned != null && Number.isFinite(planned)) {
    if (errors.length) {
      errors.push(
        `plannedEntry ${planned} cannot be justified — Entry Solver incomplete`
      );
    }
    const match = w.candidates.find(
      (c) => Math.abs(c.price - planned) < 1e-6 && c.meetsMinimumRR
    );
    if (!match) {
      errors.push(
        `plannedEntry ${planned} must appear on R map as a minRR-passing candidate`
      );
    }
    if (!w.whySelected?.trim()) {
      errors.push("whySelected required when plannedEntry is set");
    }
    if (
      /inside (support )?zone|good level|near support|better R alone/i.test(
        w.whySelected ?? ""
      )
    ) {
      errors.push(
        "whySelected insufficient — must reconstruct target→stop→R→participation→entry"
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Scenario helper for advising: extended bullish continuation with wide zone.
 * Does NOT invent fill %. Selects entry only when defensible; else needs_evidence/wait.
 */
export function adviseBullishContinuationZone(input: {
  zoneLow: number;
  zoneHigh: number;
  currentPrice: number;
  probableTarget: number | null;
  probableTargetKind: ProbableTargetKind | null;
  calculatedProjections?: Array<{ label: string; price: number }>;
  tacticalStop: number | null;
  minimumRR: number;
  structuralInvalidationNote?: string;
  /** Optional historical counts — never invent rates from these alone as %. */
  historical?: {
    missedOpportunityCases?: number;
    possibleOverOptimizationCases?: number;
  };
}): EntrySolverWorksheet {
  const extended = input.currentPrice > input.zoneHigh;
  const stop = input.tacticalStop;
  const target = input.probableTarget;
  const mid = (input.zoneLow + input.zoneHigh) / 2;
  const prices = [
    { price: input.zoneHigh, role: "opportunity_1_zone_high" },
    { price: mid, role: "zone_mid_aesthetic" },
    { price: input.zoneLow, role: "opportunity_2_zone_low" },
  ];

  const ceiling =
    target != null && stop != null
      ? computeMaximumEntryCeiling(target, stop, input.minimumRR)
      : null;

  const candidates =
    target != null && stop != null
      ? buildCandidateRMap({
          prices,
          stop,
          target,
          minimumRR: input.minimumRR,
        })
      : prices.map((p) => ({
          price: p.price,
          role: p.role,
          r: null as number | null,
          meetsMinimumRR: false,
        }));

  const hist = input.historical;
  const hasHistCounts =
    (hist?.missedOpportunityCases ?? 0) +
      (hist?.possibleOverOptimizationCases ?? 0) >
    0;

  const fillEvidenceStatus: FillEvidenceStatus = hasHistCounts
    ? "qualitative_only"
    : "insufficient";

  const participationNote = hasHistCounts
    ? `Historical Cases show missed_opportunity=${hist?.missedOpportunityCases ?? 0}, Possible Over-Optimization=${hist?.possibleOverOptimizationCases ?? 0}. Deeper entries raise R but historically risk non-participation — no calibrated fill-rate available.`
    : "FILL EVIDENCE: INSUFFICIENT — no calibrated fill-rate. Qualitatively: higher entry lowers R / raises participation likelihood; lower entry raises R / raises no-fill risk. MAX R ≠ OPTIMAL ENTRY.";

  const sheet: EntrySolverWorksheet = {
    probableTarget: target,
    probableTargetKind: input.probableTargetKind,
    calculatedProjections: input.calculatedProjections ?? [],
    tacticalStop: stop,
    structuralInvalidationNote: input.structuralInvalidationNote ?? null,
    opportunityZone: { low: input.zoneLow, high: input.zoneHigh },
    minimumRR: input.minimumRR,
    maximumEntryCeiling: ceiling,
    candidates,
    fillEvidenceStatus,
    participationNote,
    selectedEntry: null,
    whySelected: null,
    alternativeDeeperOpportunity: `Opportunity 2 near ${input.zoneLow} is a deeper market state — reassess structure/target/stop/playbook before using it; do not auto-execute for higher R.`,
    reassessmentCondition:
      "If Opportunity 1 fails and price reaches Opportunity 2: reassess sweep vs orderly correction, structure, target, stop, playbook, thesis validity.",
    verdictHint: "needs_evidence",
    priceExtended: extended,
  };

  if (extended) {
    sheet.verdictHint = "wait";
    sheet.whySelected =
      "NO CHASE while extended above zone — Entry Solver defers plannedEntry until price re-enters opportunity band.";
    return sheet;
  }

  if (target == null || stop == null || input.probableTargetKind === "calculated_projection") {
    sheet.verdictHint = "needs_evidence";
    sheet.whySelected =
      "Cannot select plannedEntry — probable target and/or tactical stop not defendable (projections alone insufficient).";
    return sheet;
  }

  // Prefer highest minRR-passing candidate that is not pure aesthetic midpoint
  // when fill evidence is insufficient — favor participation (zone_high) over max R.
  const valid = candidates.filter((c) => c.meetsMinimumRR);
  if (valid.length === 0) {
    sheet.verdictHint = "needs_evidence";
    sheet.whySelected =
      "No candidate in zone meets minimumRR under defendable target/stop.";
    return sheet;
  }

  const preferred =
    valid.find((c) => c.role === "opportunity_1_zone_high") ?? valid[0];

  // Still do not auto-select aesthetic mid solely because it sits in zone.
  if (preferred.role === "zone_mid_aesthetic" && fillEvidenceStatus === "insufficient") {
    sheet.verdictHint = "needs_evidence";
    sheet.selectedEntry = null;
    sheet.whySelected =
      "Refusing zone midpoint as plannedEntry without participation evidence — complete Entry Solver with defendable selection rationale.";
    return sheet;
  }

  sheet.selectedEntry = preferred.price;
  sheet.verdictHint = "wait"; // still waiting for fill at selected level when in zone but not filled
  sheet.whySelected = [
    `target ${target} (${input.probableTargetKind})`,
    `stop ${stop}`,
    `R map compared ${candidates.length} candidates`,
    `${preferred.role} @ ${preferred.price} → ${(preferred.r ?? 0).toFixed(2)}R ≥ min ${input.minimumRR}`,
    `participation: prefer executable Opportunity 1 over max-R Opportunity 2 while FILL EVIDENCE ${fillEvidenceStatus}`,
    `maximumEntry ceiling ${ceiling?.toFixed(2) ?? "na"} not used as recommendation`,
  ].join("; ");

  return sheet;
}

/** Empty advising scaffold for Analyze packages (AI must fill — not invent midpoints). */
export function emptyEntrySolverAdviseTemplate(minimumRR: number): string {
  return formatEntrySolverAdviseSection({
    probableTarget: null,
    probableTargetKind: null,
    calculatedProjections: [],
    tacticalStop: null,
    opportunityZone: null,
    minimumRR,
    maximumEntryCeiling: null,
    candidates: [],
    fillEvidenceStatus: "insufficient",
    participationNote:
      "FILL EVIDENCE: INSUFFICIENT until historical Cases / comparable playbook evidence attached. Do not invent fill %.",
    selectedEntry: null,
    whySelected: null,
    alternativeDeeperOpportunity:
      "If a deeper zone exists, treat as Opportunity 2 — reassessment required, not auto higher-R entry.",
    reassessmentCondition:
      "Reassess on deeper touch: structure, target, stop, playbook, thesis.",
    verdictHint: "needs_evidence",
  });
}

/**
 * Audited historical participation signals already represented in MXT ontology.
 * Does not compute a fill-rate %.
 */
export function describeExistingNoFillLearningSurfaces(): string {
  return [
    "EXISTING NO-FILL / PARTICIPATION LEARNING SURFACES (reuse — no new architecture)",
    "- plan-outcome missed_opportunity (entry never reached + target before stop)",
    "- Insights no-entry diagnosis: GOOD_FILTER vs Possible Over-Optimization",
    "- Learning Outcome kinds + Observation on planId for missed-scout path",
    "- Historical completion notes: ENTRY_NOT_REACHED / NON-ADAPTATION (practical layer)",
    "MINIMUM FIELD STILL MISSING FOR CALIBRATED FILL-RATE:",
    "- systematic closestApproach vs plannedEntry across Cases with T0",
    "- sample size of comparable Family/Playbook waits with known fill/no-fill",
    "Until those exist: FILL EVIDENCE: INSUFFICIENT — qualitative tradeoff only.",
  ].join("\n");
}
