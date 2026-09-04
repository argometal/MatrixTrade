import { SCOUTING_AI_BLOCK_REQUEST } from "./ai-block";
import { buildScopedAnalyzeApplyContractText } from "./apply-schema-contract";
import {
  buildMatrixMechanicsBrief,
  buildStockFileTrainingContext,
} from "./matrix-mechanics-brief";
import { formatMarketEvidenceSection } from "./market-evidence-format";
import type { MarketEvidence } from "./market-evidence-types";
import { buildMtaeProtocolBrief, buildMtaeTickerRequest } from "./mtae-brief";
import { formatMtaeEvidenceFirstView } from "./mtae-evidence-format";
import { MTAE_NOT_ASSESSED_LABEL } from "./mtae-momentum-format";
import type { MtaeAssessment, MtaeTimeframeMapPreset } from "./mtae-types";
import { formatPlansSnapshotSection } from "./plan-snapshot";
import type { Playbook } from "./playbook-types";
import type { TradePlan } from "./plan-types";
import { isWarReadyScoutPlan } from "./plan-helpers";
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
import { STOCK_THESIS_STATUS_LABELS } from "./stock-thesis-types";
import {
  describeExistingNoFillLearningSurfaces,
  ENTRY_SOLVER_PIPELINE,
} from "./entry-solver";
import {
  auditOptimizedEntryLearningSurfaces,
  emptyOptimizedEntryAdviseTemplate,
  resolveRiskBudgetUsd,
} from "./optimized-entry";
import type { ThesisT0Freeze } from "./thesis-t0-types";
import { wrapSnapshotText } from "./snapshot-verification";

function findFreezeForPlan(
  plan: TradePlan,
  freezes: ThesisT0Freeze[]
): ThesisT0Freeze | null {
  const planKey = plan.id.toUpperCase();
  const byPlan = freezes.find((f) =>
    f.planIds.some((id) => id.toUpperCase() === planKey)
  );
  if (byPlan) return byPlan;
  const thesisId = plan.stockThesisId?.trim();
  if (!thesisId) return null;
  const thesisKey = thesisId.toUpperCase();
  const forThesis = freezes.filter(
    (f) => f.stockThesisId.toUpperCase() === thesisKey
  );
  if (forThesis.length === 0) return null;
  const open = forThesis.find((f) => f.status === "open");
  if (open) return open;
  return [...forThesis].sort((a, b) => b.t0.localeCompare(a.t0))[0] ?? null;
}

/** Operative master prompt — five lanes, one chat cycle (MTA-002A). */
export function buildStockFileOperativePrompt(): string {
  return [
    "=== MATRIX OPERATIVE PROMPT (MTA-002A) ===",
    "You are operating MTA for ONE ticker in this package.",
    "Do NOT ask the human to re-explain Matrix architecture.",
    "",
    "SELF-CONTAINED HANDOFF (HARD RULE)",
    "This single clipboard package already includes Mechanics (MAF, Entry Solver, R$, TF governance),",
    "MTAE protocol, selected TF map/roles, Stock File dossier, active Scout, T0 (or explicit absence),",
    "latest accepted MTAE when present, and the scoped Apply contract.",
    "FORBIDDEN responses: ask the human to copy MTAE protocol, Apply schema,",
    "Mechanics, MAF protocol, Entry Solver, Scout Desk, Library rows, or any other Control snapshot.",
    "If something is missing from THIS package, say what field is absent —",
    "do not invent it and do not send the human back to Control for another copy.",
    "",
    "KEEP FIVE LANES SEPARATE (never collapse them):",
    "1. TECHNICAL (MTAE) — Evidence First by default.",
    "   Per TF only: Supports → Resistances/Targets → Bias → Confidence (≤1 sentence).",
    "   Then Integrated: Overall Thesis · Momentum Assessment · Structural Risks · Important Notes.",
    "   Profile Notes ONLY after Integrated. No Go/Wait/No, entry opt, sizing, capital.",
    "   Output block when asked to Apply technical: technical-assessment ONLY.",
    "   Forbidden in technicalSummary: maximumEntry, recommendedEntry, minimumRR,",
    "   shares, scoutVerdict, whalesAreBuying.",
    "   When volume is visible: include Phase A participation (volumeBehavior, etc.).",
    "   Volume Profile–derived levels MUST carry provenance (analysisRange + purpose).",
    "2. OPPORTUNITY QUALITY — asymmetry, distance to entry, zone reach probability,",
    "   realistic R:R, relative quality vs other candidates (qualitative ok).",
    "3. ENTRY — after Entry Solver only:",
    `   ${ENTRY_SOLVER_PIPELINE}.`,
    "   Forbidden: ZONE → arbitrary price → post-hoc R. MAX R ≠ OPTIMAL ENTRY.",
    "   maximumEntry is ceiling only. Projections ≠ probable target.",
    "   Opportunity 2 (deeper) requires reassessment, not auto higher-R entry.",
    "4. DECISION — go | wait | probe | no (+ confidence + challenges).",
    "5. STRUCTURED EXIT — short rationale, uncertainties, conditions,",
    "   then ONE valid Apply JSON block when the human requests Apply.",
    "",
    "WORKFLOW",
    "A. Read everything below — do not request extra MXT copies.",
    "B. If charts are attached: run MTAE for the REQUIRED role timeframes listed below",
    "   (geometry + Phase A participation when volume visible).",
    "C. Patch technical into Stock File via technical-assessment (Apply) when levels/invalidation need update.",
    "D. Before Scout plannedEntry: complete ENTRY SOLVER section (template below).",
    "E. Evaluate opportunity + entry + capital decision against Stock File + Playbook rules.",
    "F. Prefer decision-update on the active PLAN; if no active plan, use scout-plan-create",
    "   (never stock-case-create for an existing ticker).",
    "G. Default is Analysis Mode (natural language). Apply Mode only after explicit Apply intent.",
    "H. Never mutate or reconstruct T0. Current Stock File ≠ frozen T0.",
    "",
    "WRITE PATH (unchanged)",
    "Human pastes your JSON in Control → Apply → Validate → Accept.",
    "You prepare the proposal; you do not silently persist.",
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

export const STOCK_FILE_ANALYZE_REQUEST = `CHARTS: Use attached charts + Stock File / MarketEvidence / accepted MTAE first.
Do NOT auto-request extra W/M/3M/6M. Only ask for ONE additional timeframe when a named uncertainty remains (see TARGET + TIMEFRAME GOVERNANCE), and state exactly what it would resolve.

Then — ONE PASS when evidence already covers target + zone + stop geometry (do not fragment):
1. TECHNICAL — Evidence First for required role TFs already covered; Integrated; Profile Notes. Patch via technical-assessment when levels/invalidation need refresh (Phase A when volume visible). VP levels need analysisRange + purpose.
2. TARGET DISCIPLINE — If the defensible probableTarget is already reached/exceeded: state TARGET REACHED + TARGET REASSESSMENT REQUIRED. Do NOT invent a next probableTarget/extendedTarget from bullish plausibility, Fib, or lack of higher historical resistance. Plausibility ≠ evidence.
3. EXECUTABLE SWING PLAN (Analysis Mode primary deliverable when evidence suffices) — lead with the EXECUTABLE PLAN block (shares, exact tactical stop, max loss, expected reward, R:R, IF STOPPED / re-entry / episode R). Then WHY THIS ENTRY. Use configured 1R$ from this package — never ask the human to recall it. STOP only if an indispensable input is truly missing (name it). Exact tacticalStop required for an executable claim — never "~approx".
4. ENTRY SOLVER / OPTIMIZED ENTRY — live defensible target only; may conclude single entry OR LayeredEntry distribution (totalRisk$ ≤ 1R$). MAX R ≠ OPTIMIZED ENTRY. Apply claim requires optimizedEntryClaim + entrySolver worksheet when claiming optimized. Bare plannedEntry ≠ optimized.
5. OPPORTUNITY + DECISION — dossier + active Scout. Current mutable ≠ frozen T0. Never invent T0. Never invent Stock File existence or UI routes.
6. Apply / Save / Propose JSON → ONE AI Block using SCOPED APPLY CONTRACT in this package only.

Preferred Apply types:
- technical-assessment | decision-update | scout-plan-create | file-update / evidence-add

${SCOUTING_AI_BLOCK_REQUEST.trim()}`;

export type StockFileAnalyzeInput = {
  thesis: StockThesis;
  playbooks?: Playbook[];
  plans?: TradePlan[];
  activeEvidence?: MarketEvidence[];
  mtaePresets: MtaeTimeframeMapPreset[];
  timeframeMapId?: string;
  /** Latest accepted MTAE for this Stock File, if any. */
  latestMtaeAssessment?: MtaeAssessment | null;
  /** All T0 freezes (caller loads once); package resolves plan linkage. */
  thesisT0Freezes?: ThesisT0Freeze[];
  /** Canonical 1R monetary budget (rules.defaultRiskBudget). */
  riskBudgetUsd?: number;
};

function pickFocusPlan(thesisId: string, plans: TradePlan[]): TradePlan | undefined {
  const linked = plans.filter((p) => p.stockThesisId === thesisId);
  return (
    linked.find(isWarReadyScoutPlan) ??
    linked.find((p) => p.status === "entered") ??
    linked.find((p) => p.status === "expired") ??
    linked[0]
  );
}

/** Explicit T0 section — never silent reconstruction. */
export function formatAnalyzeT0Section(
  freeze: ThesisT0Freeze | null,
  focusPlanId: string | null
): string {
  const lines = [
    "=== T0 FREEZE (immutable decision-time evidence) ===",
    "RULE: Current Stock File / MTAE / Scout may change. T0 must not.",
    "Historical reconstruction ≠ T0. Never invent a freeze.",
  ];

  if (!freeze) {
    lines.push(
      "PERSISTED_T0: NO PERSISTED T0",
      focusPlanId
        ? `related_plan:${focusPlanId} — no freeze found for this plan/decision.`
        : "related_plan:none",
      "Do not reconstruct T0 from current Profile/Plan. Say NO PERSISTED T0 when asked."
    );
    return lines.join("\n");
  }

  const d = freeze.decision;
  const p = freeze.plan;
  const body: Array<string | null | undefined> = [
    `PERSISTED_T0: YES`,
    `t0_id:${freeze.id}`,
    `t0_timestamp:${freeze.t0}`,
    `frozen_at:${freeze.createdAt}`,
    `episode_status:${freeze.status}`,
    `stock_thesis_id:${freeze.stockThesisId}`,
    `plan_ids:${freeze.planIds.join(",")}`,
    focusPlanId ? `related_plan:${focusPlanId}` : null,
    d
      ? [
          `frozen_decision_id:${d.decisionId}`,
          `frozen_verdict:${d.verdict}`,
          `frozen_decided_at:${d.decidedAt}`,
          d.challenges?.length
            ? `frozen_challenges:${d.challenges.join(" | ")}`
            : null,
        ]
          .filter(Boolean)
          .join("\n")
      : "frozen_decision:none",
    "",
    "FROZEN PLAN GEOMETRY (owned by T0 — do not overwrite from live Scout)",
    `plannedEntry:${p.plannedEntry ?? "na"}`,
    `originalEntry:${p.originalEntry ?? p.plannedEntry ?? "na"}`,
    `stopPrice:${p.stopPrice ?? "na"}`,
    `targetPrice:${p.targetPrice ?? "na"}`,
    `plannedRR:${p.plannedRR ?? "na"}`,
    p.participationBlocker
      ? `participationBlocker:${p.participationBlocker}`
      : null,
    p.reviseIf?.length ? `reviseIf:${p.reviseIf.join(" | ")}` : null,
    p.playbookId ? `playbookId:${p.playbookId}` : "playbookId:none",
    "",
    "TRACE: PLAN/Decision → T0 (this section) → Reality → Evaluation (Case/Insights).",
    "Accepting technical-assessment or Stock File updates must NOT mutate this freeze.",
  ];
  lines.push(...body.filter((l): l is string => typeof l === "string"));
  return lines.join("\n");
}

function formatIdentityBanner(thesis: StockThesis, focusPlan?: TradePlan): string {
  return [
    "=== TICKER IDENTITY ===",
    `ticker:${thesis.ticker}`,
    `stock_file_id:${thesis.id}`,
    `lifecycle_status:${thesis.status} (${STOCK_THESIS_STATUS_LABELS[thesis.status]})`,
    `style:${thesis.style}`,
    `version:${thesis.version}`,
    focusPlan
      ? `focus_plan:${focusPlan.id} lifecycle:${focusPlan.status}`
      : "focus_plan:none",
    "",
    "STATE LAYERS (do not collapse)",
    "1. CURRENT MUTABLE — Stock File + latest MTAE + live Scout below",
    "2. FROZEN T0 — separate section; immutable if present",
  ].join("\n");
}

/**
 * One-copy Analyze package for a Stock File:
 * operative prompt + Mechanics + MTAE + dossier + active Scout + T0 + Apply contract.
 */
export function buildStockFileAnalyzePackage(input: StockFileAnalyzeInput): string {
  const { thesis, mtaePresets } = input;
  const playbooks = input.playbooks ?? [];
  const plans = input.plans ?? [];
  const evidence = input.activeEvidence ?? [];
  const synthesis = buildStockProfileSynthesis(thesis, evidence);
  const focusPlan = pickFocusPlan(thesis.id, plans);
  const freezes = input.thesisT0Freezes ?? [];
  const freeze = focusPlan ? findFreezeForPlan(focusPlan, freezes) : null;
  const timeframeMapId =
    input.timeframeMapId ??
    input.latestMtaeAssessment?.timeframeMapId ??
    "swing-6m";
  const riskBudgetUsd = resolveRiskBudgetUsd(input.riskBudgetUsd);

  const parts: string[] = [
    buildStockFileOperativePrompt(),
    "",
    formatIdentityBanner(thesis, focusPlan),
    "",
    buildMatrixMechanicsBrief({ riskBudgetUsd }),
    "",
    describeExistingNoFillLearningSurfaces(),
    "",
    auditOptimizedEntryLearningSurfaces(),
    "",
    buildMtaeProtocolBrief(mtaePresets),
    "",
    buildMtaeTickerRequest({
      stockProfileId: thesis.id,
      ticker: thesis.ticker,
      timeframeMapId,
      presets: mtaePresets,
    }),
    "",
    buildStockFileTrainingContext({
      thesis,
      playbooks,
      plans: plans.filter((p) => p.stockThesisId === thesis.id),
    }),
    "",
    formatSynthesisSection(synthesis),
    "",
    formatMarketEvidenceSection(evidence),
  ];

  if (input.latestMtaeAssessment) {
    parts.push(
      "",
      "=== LATEST ACCEPTED MTAE (mutable technical state) ===",
      formatMtaeEvidenceFirstView(input.latestMtaeAssessment)
    );
  } else {
    parts.push(
      "",
      "=== LATEST ACCEPTED MTAE ===",
      `status:${MTAE_NOT_ASSESSED_LABEL}`,
      "No accepted technical-assessment for this Stock File yet."
    );
  }

  parts.push("", formatAnalyzeT0Section(freeze, focusPlan?.id ?? null));

  if (focusPlan) {
    parts.push(
      "",
      `=== ACTIVE SCOUT · ${focusPlan.id} (live / mutable) ===`,
      formatPlansSnapshotSection([focusPlan])
    );
    const decision = formatDecisionSection(focusPlan);
    if (decision) parts.push("", decision);
    const probe = formatProbeSection(focusPlan);
    if (probe) parts.push("", probe);
    const layered = formatLayeredEntrySection(focusPlan);
    if (layered) parts.push("", layered);
    // P10 capture surface for WAIT QC
    if (focusPlan.participationBlocker || focusPlan.reviseIf?.length) {
      parts.push(
        "",
        "=== PARTICIPATION CAPTURE (P10) ===",
        focusPlan.participationBlocker
          ? `participationBlocker:${focusPlan.participationBlocker}`
          : "participationBlocker:none",
        focusPlan.reviseIf?.length
          ? `reviseIf:${focusPlan.reviseIf.join(" | ")}`
          : "reviseIf:none",
        `originalEntry:${focusPlan.originalEntry ?? focusPlan.plannedEntry ?? "na"}`,
        `executableEntry:${focusPlan.plannedEntry ?? "na"}`
      );
    }
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

  parts.push(
    "",
    emptyOptimizedEntryAdviseTemplate(thesis.riskRules.minimumRR, riskBudgetUsd),
    "",
    buildScopedAnalyzeApplyContractText(),
    "",
    "=== REQUEST ===",
    STOCK_FILE_ANALYZE_REQUEST
  );

  return wrapSnapshotText(`${thesis.ticker} ANALYZE`, parts.join("\n"));
}
