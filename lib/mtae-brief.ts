import type { MtaeTimeframeMapPreset } from "./mtae-types";

/** Protocol primer for Control → Technical analysis (not Mechanics, not Playbook). */
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
    "Do NOT predict price. Do NOT decide whether capital should be allocated.",
    "",
    "NOT THIS MODULE",
    "- Playbook = HOW (method across tickers)",
    "- Mechanics = Matrix constitution (Apply gate, Entry Solver rules)",
    "- Scout = capital gate (go/wait/no, Entry Solver, minimum R)",
    "- MTAE ends at technical JSON. Scout comes AFTER Accept into Stock File.",
    "",
    "PIPELINE (fixed)",
    "1. Analyze each timeframe independently — never mix conclusions mid-pass.",
    "2. Per TF: trend + confidence, structure, ranked supports, ranked resistances,",
    "   battle zones (reachProbability, asymmetryQuality, technicalImportance),",
    "   probableTarget vs extendedTarget (never the same), structuralInvalidation, contradictions.",
    "3. Hierarchy integration using timeframe ROLES (not hard-coded TF names).",
    "4. Technical summary only — no Entry Solver, maximumEntry, RR, shares, Scout verdict.",
    "5. Export ONE JSON block: type technical-assessment.",
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
    "Human pastes in MatrixTrade Control → Update → Validate → Accept.",
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
    "Attach charts for each role timeframe.",
    "Run MTAE protocol. Return ONE technical-assessment JSON only.",
    "Forbidden in technicalSummary: maximumEntry, recommendedEntry, minimumRR, shares, scoutVerdict.",
    "After human Accept, Matrix Scout may use the updated Stock File — not in this block.",
  ]
    .filter(Boolean)
    .join("\n");
}
