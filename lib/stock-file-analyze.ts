import { SCOUTING_AI_BLOCK_REQUEST } from "./ai-block";
import {
  buildMatrixMechanicsBrief,
  buildStockFileTrainingContext,
} from "./matrix-mechanics-brief";
import { formatMarketEvidenceSection } from "./market-evidence-format";
import type { MarketEvidence } from "./market-evidence-types";
import { buildMtaeProtocolBrief, buildMtaeTickerRequest } from "./mtae-brief";
import type { MtaeTimeframeMapPreset } from "./mtae-types";
import { formatPlansSnapshotSection } from "./plan-snapshot";
import type { Playbook } from "./playbook-types";
import type { TradePlan } from "./plan-types";
import { formatDecisionSection } from "./scout-decision";
import { formatProbeSection } from "./scout-probe";
import { formatLayeredEntrySection } from "./layered-entry-types";
import {
  buildFamilyBFillProjections,
  formatFamilyBAssessmentSection,
  isFamilyBPlaybook,
  synthesizeFamilyBAssessment,
  validateFamilyBPlan,
} from "./family-b-assessment";
import {
  buildStockProfileSynthesis,
  formatSynthesisSection,
} from "./stock-profile-synthesis";
import type { StockThesis } from "./stock-thesis-types";
import { wrapSnapshotText } from "./snapshot-verification";

/** Operative master prompt — five lanes, one chat cycle (MTA-002A). */
export function buildStockFileOperativePrompt(): string {
  return [
    "=== MATRIX OPERATIVE PROMPT (MTA-002A) ===",
    "You are operating MtA for ONE ticker in this package.",
    "Do NOT ask the human to re-explain Matrix architecture.",
    "",
    "KEEP FIVE LANES SEPARATE (never collapse them):",
    "1. TECHNICAL (MTAE) — Evidence First by default.",
    "   Per TF only: Supports → Resistances/Targets → Bias → Confidence (≤1 sentence).",
    "   Then Integrated: Overall Thesis · Momentum Assessment · Structural Risks · Important Notes.",
    "   Profile Notes ONLY after Integrated. No Go/Wait/No, entry opt, sizing, capital.",
    "   Output block when asked to Apply technical: technical-assessment ONLY.",
    "   Forbidden in technicalSummary: maximumEntry, recommendedEntry, minimumRR,",
    "   shares, scoutVerdict, whalesAreBuying.",
    "2. OPPORTUNITY QUALITY — asymmetry, distance to entry, zone reach probability,",
    "   realistic R:R, relative quality vs other candidates (qualitative ok).",
    "3. ENTRY — max admissible, recommended, entry type, stop (strategy stop for R),",
    "   probable target, extended target, activation conditions.",
    "4. DECISION — go | wait | probe | no (+ confidence + challenges).",
    "5. STRUCTURED EXIT — short rationale, uncertainties, conditions,",
    "   then ONE valid Apply JSON block when the human requests Apply.",
    "",
    "WORKFLOW",
    "A. Read Mechanics + Stock File + active Scout below.",
    "B. If charts are attached: run MTAE (geometry + Phase A participation when volume visible).",
    "C. Patch technical into Stock File via technical-assessment (Apply) when levels/invalidation need update.",
    "D. Evaluate opportunity + entry + capital decision against Stock File + Playbook rules.",
    "E. Prefer decision-update on the active PLAN; if no active plan, use scout-plan-create",
    "   (never stock-case-create for an existing ticker).",
    "F. Default is Analysis Mode (natural language). Apply Mode only after explicit Apply intent.",
    "",
    "CONSISTENCY RULES",
    "- Strategy stop for R ≠ structural invalidation unless they intentionally match.",
    "- High-quality thesis can still be wait/no if entry asymmetry is poor.",
    "- Do not force deep-rebate entries on secular uptrends that rarely discount that far",
    "  (prefer playbook secular-trend-continuation / Family B; use structural-pullback-entry / Family A for deep discounts;",
    "  otherwise state the family mismatch explicitly).",
    "- Family B: propose starter / preferred_pullback / deep_pullback layers only with visible structure.",
    "  Starter ≠ full conviction. Prefer largest allocation on preferred pullback. No chase. Fib is context only.",
    "  Do not widen invalidation or raise target to force R. Return familyBAssessment + layeredEntry on decision-update when Apply.",
    "- Return exactly ONE JSON block when Apply is requested — ASCII quotes only.",
  ].join("\n");
}

export const STOCK_FILE_ANALYZE_REQUEST = `Attach charts for the MTAE role timeframes (include volume when possible).

Then:
1. TECHNICAL — Evidence First per TF, then Integrated, then Profile Notes. If levels/invalidation need refresh, prepare technical-assessment.
2. OPPORTUNITY + ENTRY + DECISION — using updated technical + this dossier + active Scout.
3. When the human says Apply / Save / Propose JSON: return ONE AI Block only.

Preferred Apply types for this package:
- technical-assessment (MTAE only — no capital fields)
- decision-update (existing PLAN)
- scout-plan-create (no active PLAN — NEW PLAN-xxx on this Stock File)
- file-update / evidence-add when dossier needs patch without a full scout decision

${SCOUTING_AI_BLOCK_REQUEST.trim()}`;

export type StockFileAnalyzeInput = {
  thesis: StockThesis;
  playbooks?: Playbook[];
  plans?: TradePlan[];
  activeEvidence?: MarketEvidence[];
  mtaePresets: MtaeTimeframeMapPreset[];
  timeframeMapId?: string;
};

function pickFocusPlan(thesisId: string, plans: TradePlan[]): TradePlan | undefined {
  const linked = plans.filter((p) => p.stockThesisId === thesisId);
  return (
    linked.find((p) => p.status === "watching" || p.status === "ready") ??
    linked.find((p) => p.status === "entered") ??
    linked.find((p) => p.status === "expired") ??
    linked[0]
  );
}

/**
 * One-copy Analyze package for a Stock File:
 * operative prompt + Mechanics + MTAE + dossier + active Scout + Apply request.
 */
export function buildStockFileAnalyzePackage(input: StockFileAnalyzeInput): string {
  const { thesis, mtaePresets } = input;
  const playbooks = input.playbooks ?? [];
  const plans = input.plans ?? [];
  const evidence = input.activeEvidence ?? [];
  const synthesis = buildStockProfileSynthesis(thesis, evidence);
  const focusPlan = pickFocusPlan(thesis.id, plans);

  const parts: string[] = [
    buildStockFileOperativePrompt(),
    "",
    buildMatrixMechanicsBrief(),
    "",
    buildMtaeProtocolBrief(mtaePresets),
    "",
    buildMtaeTickerRequest({
      stockProfileId: thesis.id,
      ticker: thesis.ticker,
      timeframeMapId: input.timeframeMapId,
      presets: mtaePresets,
    }),
    "",
    buildStockFileTrainingContext({ thesis, playbooks }),
    "",
    formatSynthesisSection(synthesis),
    "",
    formatMarketEvidenceSection(evidence),
  ];

  if (focusPlan) {
    parts.push(
      "",
      `=== ACTIVE SCOUT · ${focusPlan.id} ===`,
      formatPlansSnapshotSection([focusPlan])
    );
    const decision = formatDecisionSection(focusPlan);
    if (decision) parts.push("", decision);
    const probe = formatProbeSection(focusPlan);
    if (probe) parts.push("", probe);
    const layered = formatLayeredEntrySection(focusPlan);
    if (layered) parts.push("", layered);
    if (isFamilyBPlaybook(focusPlan.playbookId)) {
      const assessment = synthesizeFamilyBAssessment({
        playbookId: focusPlan.playbookId,
        assessment: focusPlan.familyBAssessment,
        plan: focusPlan,
        thesis,
      });
      const fillStates = buildFamilyBFillProjections(focusPlan);
      const { warnings } = validateFamilyBPlan({
        playbookId: focusPlan.playbookId,
        plan: focusPlan,
        thesis,
        assessment,
        minimumRR: thesis.riskRules.minimumRR,
      });
      parts.push(
        "",
        formatFamilyBAssessmentSection({
          assessment,
          plan: focusPlan,
          minimumRR: thesis.riskRules.minimumRR,
          fillStates,
        })
      );
      if (warnings.length) {
        parts.push("FAMILY B WARNINGS");
        for (const w of warnings) parts.push(`- ${w}`);
      }
      parts.push(
        "FAMILY B CHECKLIST: propose familyBAssessment + layeredEntry roles on decision-update; Scout verdict via existing go|wait|probe|no."
      );
    }
  } else {
    parts.push(
      "",
      "=== ACTIVE SCOUT ===",
      "(none) — after technical Accept, propose scout-plan-create for a NEW PLAN window."
    );
  }

  parts.push("", "=== REQUEST ===", STOCK_FILE_ANALYZE_REQUEST);

  return wrapSnapshotText(`${thesis.ticker} ANALYZE`, parts.join("\n"));
}
