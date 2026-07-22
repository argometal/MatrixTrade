import type { MtaeTimeframeMapPreset } from "./mtae-types";

/** Protocol primer for Control → Library → Technical Analysis (not Mechanics, not Playbook). */
export function buildMtaeProtocolBrief(presets: MtaeTimeframeMapPreset[]): string {
  const presetLines =
    presets.length === 0
      ? ["(no presets loaded — declare timeframeRoles inline)"]
      : presets.map(
          (p) =>
            `- ${p.id}: strategic=${p.roles.strategic_tf} opportunity=${p.roles.opportunity_tf} refinement=${p.roles.refinement_tf} execution=${p.roles.execution_tf}` +
            (p.roles.execution_detail_tf ? ` detail=${p.roles.execution_detail_tf}` : "")
        );

  return [
    "=== MTAE PROTOCOL (Technical Analysis Engine) ===",
    "Module: technical observation ONLY — not Playbook, not Scout, not capital allocation.",
    "",
    "OBJECTIVE",
    "Convert multi-timeframe charts into a structured technical assessment.",
    "Identify: structural trend, battle zones, support/resistance hierarchy,",
    "probable vs extended targets, structural invalidation, contradictions, confidence.",
    "Separately assess expansion capacity (Momentum / Expansion Assessment).",
    "A valid structure must NOT automatically imply the opportunity deserves capital.",
    "Do NOT predict price. Do NOT decide whether capital should be allocated.",
    "",
    "NOT THIS MODULE",
    "- Playbook = HOW (method across tickers)",
    "- Mechanics = MtA constitution (Apply gate, Entry Solver rules)",
    "- Scout = capital gate (go/wait/no, Entry Solver, minimum R)",
    "- MTAE ends at technical JSON. Scout comes AFTER Accept into Stock File.",
    "",
    "PIPELINE (fixed)",
    "1. Analyze each timeframe independently — never mix conclusions mid-pass.",
    "2. Per TF: trend + confidence, structure, ranked supports, ranked resistances,",
    "   battle zones (reachProbability, asymmetryQuality, technicalImportance),",
    "   probableTarget vs extendedTarget (never the same), structuralInvalidation, contradictions.",
    "   OPTIONAL Phase A participation{}: volumeBehavior, wickAnalysis, candleSignals,",
    "   movementCharacter (legacy primary pattern and/or expansion state+",
    "   directionalEfficiency+rangeProgression), historicalReactionZones, largeParticipantFootprint.",
    "3. Hierarchy integration using timeframe ROLES (not hard-coded TF names).",
    "   OPTIONAL integrated.participationSynthesis{dominantCondition, buyingEvidence,",
    "   sellingEvidence, unresolvedSignals, confidence}.",
    "   OPTIONAL integrated.momentumAssessment{expansionPotential, currentState,",
    "   capitalEfficiencyConcern, rationale[], scoutImplication, confidence}.",
    "4. Technical summary only — no Entry Solver, maximumEntry, RR, shares, Scout verdict.",
    "5. Export ONE JSON block: type technical-assessment.",
    "",
    "PRESENTATION RULES (Analysis Mode — default)",
    "Technical analysis is evidence-first. For every timeframe present ONLY:",
    "  Supports · Resistances/Targets · Bias · Confidence.",
    "Do not explain why before presenting evidence. Max one sentence of explanation per TF.",
    "No trade management, psychology, capital allocation, or market narrative during TF analysis.",
    "Detailed interpretation belongs ONLY in Integrated Assessment.",
    "Profile Notes (if any) come AFTER Integrated Assessment — never before technical evidence.",
    "Explain Mode: only when the human asks why a level was chosen — then expand reasoning.",
    "Compact Analysis Mode enables comparing many tickers; deepen only on demand.",
    "",
    "MOMENTUM / EXPANSION RULES",
    "Distinguish: (1) structural quality vs (2) expansion capacity.",
    "momentumAssessment is technical context only — never go/wait/probe/no,",
    "never maximumEntry, R:R, shares, or capital allocation.",
    "Low expansion potential does NOT invalidate the structural thesis.",
    "It means Scout should demand stronger asymmetry or improved movement",
    "before consuming risk capital (scoutImplication: require_better_entry|",
    "require_momentum_improvement|standby).",
    "Do not recommend higher entry confirmation when it destroys asymmetry.",
    "Evidence may include candle overlap, range rotation, declining follow-through,",
    "compression, volume response, failed expansion, time without price progress.",
    "Omit momentumAssessment when not assessed — never invent false evidence.",
    "",
    "PARTICIPATION RULES (Phase A)",
    "Structure + participation — not capital. Evidence is contextual/probabilistic.",
    "If volume bars missing: volumeBehavior.state=indeterminate — never invent volume.",
    "Forbidden: whalesAreBuying / identity claims. Use largeParticipantFootprint.signal",
    "possible_accumulation|possible_distribution|absorption|indeterminate|none only.",
    "Candle patterns: small high-value set only (doji, hammer, shooting_star, engulfing,",
    "inside_bar, outside_bar, rejection_candle, wide_range_candle, failed_breakout_candle).",
    "A doji is not automatic reversal — location + context + confirmation required.",
    "short_squeeze / accumulation are possible classifications — not proof of positioning.",
    "",
    "TIMEFRAME ROLES (configurable)",
    "strategic_tf — structure spine",
    "opportunity_tf — strategic opportunity + target pair",
    "refinement_tf — battle zones",
    "execution_tf — timing context only",
    "execution_detail_tf — optional lower frame; never invalidates higher roles",
    "Rules: lower TF never invalidates higher TF; higher TF never justifies buying at any price.",
    "",
    "PRESETS (pick one or declare roles inline)",
    ...presetLines,
    "",
    "APPLY",
    "Return type technical-assessment with stockProfileId, ticker, timeframeRoles,",
    "perTimeframe[], integrated{}, technicalSummary{}, patchStockFile true.",
    "Human pastes in MtA Control → Apply → Validate → Accept.",
    "Accept stores the assessment and patches Stock File levels/invalidation/historicalAnalysis.",
    "",
    "CALIBRATION",
    "Human procedure corrections use type technical-calibration (errorType, fieldPath, aiValue, humanValue, reason).",
    "Train consistency of the procedure — not P/L outcomes. Never optimize for agreement.",
    "",
    "=== REQUEST ===",
    "When charts are provided: run MTAE Stages 1–5 and return ONE technical-assessment JSON block.",
    "If stockProfileId is unknown, ask for it. Do not invent Entry Solver fields.",
  ].join("\n");
}

export function buildMtaeTickerRequest(input: {
  stockProfileId: string;
  ticker: string;
  timeframeMapId?: string;
  presets: MtaeTimeframeMapPreset[];
}): string {
  const preset =
    input.presets.find((p) => p.id === (input.timeframeMapId ?? "swing-6m")) ?? input.presets[0];
  const roles = preset?.roles ?? {
    strategic_tf: "6M",
    opportunity_tf: "3M",
    refinement_tf: "1M",
    execution_tf: "1W",
  };

  return [
    "=== MTAE REQUEST (this ticker) ===",
    `ticker:${input.ticker}`,
    `stockProfileId:${input.stockProfileId}`,
    `timeframeMapId:${preset?.id ?? "custom"}`,
    `strategic_tf:${roles.strategic_tf}`,
    `opportunity_tf:${roles.opportunity_tf}`,
    `refinement_tf:${roles.refinement_tf}`,
    `execution_tf:${roles.execution_tf}`,
    roles.execution_detail_tf ? `execution_detail_tf:${roles.execution_detail_tf}` : null,
    "",
    "Attach charts for each role timeframe (include volume bars when possible).",
    "Run MTAE protocol including Phase A participation when volume is visible.",
    "Return ONE technical-assessment JSON only.",
    "Forbidden in technicalSummary: maximumEntry, recommendedEntry, minimumRR, shares, scoutVerdict, whalesAreBuying.",
    "After human Accept, Matrix Scout may use the updated Stock File — not in this block.",
  ]
    .filter(Boolean)
    .join("\n");
}
