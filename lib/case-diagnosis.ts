/**
 * MXT 016a — deterministic Case diagnosis (equation layer).
 * Pipeline: Case → evaluateCase → diagnoseCase → Learning aggregation.
 * Outcome alone never drives OVER_OPTIMIZATION or Decision Quality.
 */

import type { CaseEvaluation } from "./case-evaluation-types";
import type { ThesisCase } from "./thesis-case-types";
import type {
  CaseDiagnosis,
  CaseDiagnosisEvidence,
  CaseDSubtype,
  DiagnosisAggregate,
  EntryCaseFamily,
  FalseVirtuousLoopState,
  NoEntryDiagnosisClass,
} from "./case-diagnosis-types";
import type { CaseParticipationClass } from "./learning-overview-types";
import type { DecisionVerdict } from "./scout-decision-types";

function participationFromVerdict(
  verdict: DecisionVerdict | null | undefined
): CaseParticipationClass | null {
  if (!verdict) return null;
  if (verdict === "go") return "entry";
  if (verdict === "wait" || verdict === "no") return "no_entry";
  if (verdict === "probe") return "probe";
  return null;
}

export const EQ = {
  NE_MISSING_T0: "EQ-016A-NE-MISSING-T0",
  NE_GOOD_FILTER: "EQ-016A-NE-GOOD-FILTER",
  NE_OVER_OPT: "EQ-016A-NE-OVER-OPT",
  NE_INDETERMINATE: "EQ-016A-NE-INDETERMINATE",
  ENT_A: "EQ-016A-ENT-A",
  ENT_C: "EQ-016A-ENT-C",
  ENT_D: "EQ-016A-ENT-D",
  ENT_INDETERMINATE: "EQ-016A-ENT-INDETERMINATE",
  D1: "EQ-028-D1-NO-ENTRY-WOULD-PROFIT",
  D2: "EQ-028-D2-NO-ENTRY-WOULD-LOSS",
  D3: "EQ-028-D3-NO-ENTRY-INDETERMINATE",
  D4: "EQ-028-D4-DEFICIENT-EXEC-WOULD-PROFIT",
  D5: "EQ-028-D5-DEFICIENT-EXEC-WOULD-LOSS",
  D6: "EQ-028-D6-DEFICIENT-EXEC-INDETERMINATE",
  PROBE: "EQ-016A-PROBE-INDETERMINATE",
  UNCLASSIFIED: "EQ-016A-UNCLASSIFIED",
  FVL: "EQ-016A-FVL-1",
  CONDITION: "EQ-016A-CONDITION-1",
} as const;

/** Counterfactual / planned-path polarity — never mixes into portfolio P/L. */
export function counterfactualPolarity(
  counterfactualR: number | null | undefined
): "favorable" | "adverse" | "unknown" {
  if (counterfactualR == null || !Number.isFinite(counterfactualR)) {
    return "unknown";
  }
  if (counterfactualR > 0) return "favorable";
  if (counterfactualR < 0) return "adverse";
  return "unknown";
}

function caseDResult(
  planId: string,
  subtype: CaseDSubtype,
  inputs: CaseDiagnosisEvidence[],
  missing: string[],
  reason: string
): CaseDiagnosis {
  const equationId =
    subtype === "D1"
      ? EQ.D1
      : subtype === "D2"
        ? EQ.D2
        : subtype === "D3"
          ? EQ.D3
          : subtype === "D4"
            ? EQ.D4
            : subtype === "D5"
              ? EQ.D5
              : EQ.D6;
  return {
    planId,
    classification: { kind: "case_d", value: subtype },
    caseDSubtype: subtype,
    equationId,
    inputsUsed: inputs,
    missingInputs: missing,
    reason,
  };
}

function verdictOf(c: ThesisCase): DecisionVerdict | null {
  return (
    c.t0Evidence.decision?.verdict ??
    (c.postDecision.execution.kind === "no_trade"
      ? c.postDecision.execution.scoutVerdict
      : null) ??
    null
  );
}

/**
 * Outcome polarity for Entry families only.
 * Explicitly NOT used for no-entry OVER_OPTIMIZATION.
 */
export function outcomePolarityFromFacts(
  facts: string[]
): "favorable" | "adverse" | "unknown" {
  const blob = facts.join(" | ").toLowerCase();
  const pnl = blob.match(/pnl hint:\s*(-?\d+(?:\.\d+)?)/);
  if (pnl) {
    const n = Number(pnl[1]);
    if (Number.isFinite(n) && n > 0) return "favorable";
    if (Number.isFinite(n) && n < 0) return "adverse";
  }
  const r = blob.match(/realized r hint:\s*(-?\d+(?:\.\d+)?)/);
  if (r) {
    const n = Number(r[1]);
    if (Number.isFinite(n) && n > 0) return "favorable";
    if (Number.isFinite(n) && n < 0) return "adverse";
  }
  if (
    /\b(stop|stopped|loss|adverse)\b/.test(blob) &&
    !/\b(target|win|profit)\b/.test(blob)
  ) {
    return "adverse";
  }
  if (/\b(target|win|profit|favorable)\b/.test(blob)) {
    return "favorable";
  }
  return "unknown";
}

function evidence(
  inputKey: string,
  value: string,
  evidenceRef: string
): CaseDiagnosisEvidence {
  return { inputKey, value, evidenceRef };
}

function diagnoseNoEntry(
  planId: string,
  c: ThesisCase,
  evaluation: CaseEvaluation,
  counterfactualR: number | null | undefined
): CaseDiagnosis {
  const inputs: CaseDiagnosisEvidence[] = [];
  const missing: string[] = [];

  inputs.push(
    evidence(
      "participation",
      "no_entry",
      `verdict=${verdictOf(c) ?? "—"}`
    )
  );

  if (!c.t0Evidence.available || !c.t0Evidence.decision) {
    missing.push("t0_freeze");
    return {
      planId,
      classification: { kind: "no_entry", value: "INDETERMINATE" },
      equationId: EQ.NE_MISSING_T0,
      inputsUsed: inputs,
      missingInputs: missing,
      reason:
        "Missing usable T0 freeze — cannot distinguish Good Filter from Over-optimization or Case D plan-path accounting.",
    };
  }

  inputs.push(
    evidence(
      "t0_available",
      "true",
      `integrity=${c.t0Evidence.integrity}`
    )
  );

  const rr = evaluation.realityRelationship.value;
  const rrEvidence = evaluation.realityRelationship.evidence
    .map((e) => `${e.t0Ref} → ${e.realityRef}`)
    .join("; ");
  inputs.push(evidence("reality_relationship", rr, rrEvidence || "lane"));

  const cfPol = counterfactualPolarity(counterfactualR);
  inputs.push(
    evidence(
      "counterfactual_r",
      counterfactualR == null || !Number.isFinite(counterfactualR)
        ? "unknown"
        : String(counterfactualR),
      "learning_outcome.counterfactualR — never portfolio P/L"
    )
  );

  // Outcome facts recorded but MUST NOT drive no-entry Over-Opt class.
  inputs.push(
    evidence(
      "outcome_facts_isolated",
      "ignored_for_no_entry_overopt_class",
      evaluation.outcome.facts.join(" | ") || "none"
    )
  );

  if (rr === "condition_not_met" || rr === "invalidated") {
    return {
      planId,
      classification: { kind: "no_entry", value: "GOOD_FILTER" },
      equationId: EQ.NE_GOOD_FILTER,
      inputsUsed: inputs,
      missingInputs: missing,
      reason:
        rr === "invalidated"
          ? "No-entry with T0 conditions later invalidated — filter consistent with Reality."
          : "No-entry with frozen conditions not met in Reality — legitimate filter.",
    };
  }

  // When conditions were met (or Reality unclear) and planned path R is evaluable,
  // Case D plan-divergence subtypes take precedence over bare Over-Opt.
  if (cfPol === "favorable") {
    return caseDResult(
      planId,
      "D1",
      inputs,
      missing,
      "D1 — No Entry / Would Profit: no actual fill; planned path counterfactual R is positive. Realized R remains 0; CF R is not portfolio P/L. Does not assign MAF components."
    );
  }
  if (cfPol === "adverse") {
    return caseDResult(
      planId,
      "D2",
      inputs,
      missing,
      "D2 — No Entry / Would Loss: no actual fill; planned path counterfactual R is negative. Realized R remains 0; avoided planned loss is still CF −R, not portfolio P/L. Does not assign MAF components."
    );
  }

  if (rr === "condition_met") {
    return {
      planId,
      classification: { kind: "no_entry", value: "OVER_OPTIMIZATION" },
      equationId: EQ.NE_OVER_OPT,
      inputsUsed: inputs,
      missingInputs: missing,
      reason:
        "No-entry while T0 participation conditions later met in Reality — possible over-restrictive filter. Counterfactual planned R not reliably evaluable (D1/D2 not assigned).",
    };
  }

  if (rr === "mixed" || rr === "INDETERMINATE") {
    if (rr === "INDETERMINATE") missing.push("reality_relationship_clarity");
    missing.push("counterfactual_r");
    return caseDResult(
      planId,
      "D3",
      inputs,
      missing,
      "D3 — No Entry / Indeterminate: no fill; planned-path counterfactual R cannot be determined reliably. Realized R remains 0."
    );
  }

  return {
    planId,
    classification: { kind: "no_entry", value: "INDETERMINATE" },
    equationId: EQ.NE_INDETERMINATE,
    inputsUsed: inputs,
    missingInputs: missing,
    reason: "Unhandled Reality relationship for no-entry diagnosis.",
  };
}

function diagnoseEntry(
  planId: string,
  c: ThesisCase,
  evaluation: CaseEvaluation,
  counterfactualR: number | null | undefined
): CaseDiagnosis {
  const inputs: CaseDiagnosisEvidence[] = [];
  const missing: string[] = [];

  inputs.push(evidence("participation", "entry", `verdict=${verdictOf(c)}`));

  if (!c.t0Evidence.available) {
    missing.push("t0_freeze");
    return {
      planId,
      classification: { kind: "entry_family", value: "INDETERMINATE" },
      equationId: EQ.ENT_INDETERMINATE,
      inputsUsed: inputs,
      missingInputs: missing,
      reason: "Entry without usable T0 — family indeterminate.",
    };
  }

  const dq = evaluation.decisionQuality.value;
  const eq = evaluation.executionQuality.value;
  inputs.push(
    evidence(
      "decision_quality",
      dq,
      evaluation.decisionQuality.evidence.map((e) => e.note).join("; ")
    )
  );
  inputs.push(
    evidence(
      "execution_quality",
      eq,
      evaluation.executionQuality.evidence.map((e) => e.note).join("; ")
    )
  );

  const polarity = outcomePolarityFromFacts(evaluation.outcome.facts);
  inputs.push(
    evidence(
      "outcome_polarity",
      polarity,
      evaluation.outcome.facts.join(" | ") || "none"
    )
  );

  const cfPol = counterfactualPolarity(counterfactualR);
  inputs.push(
    evidence(
      "counterfactual_r",
      counterfactualR == null || !Number.isFinite(counterfactualR)
        ? "unknown"
        : String(counterfactualR),
      "planned-path R when evaluable — never portfolio P/L"
    )
  );

  if (dq === "not_supported" || eq === "violated") {
    if (cfPol === "favorable") {
      return caseDResult(
        planId,
        "D4",
        inputs,
        missing,
        "D4 — Deficient Execution / Would Profit: actual path diverged from plan; planned path counterfactual R is positive. Does not assign MAF components."
      );
    }
    if (cfPol === "adverse") {
      return caseDResult(
        planId,
        "D5",
        inputs,
        missing,
        "D5 — Deficient Execution / Would Loss: actual path diverged from plan; planned path counterfactual R is negative. Does not assign MAF components."
      );
    }
    return caseDResult(
      planId,
      "D6",
      inputs,
      [...missing, "counterfactual_r"],
      "D6 — Deficient Execution / Indeterminate: actual path diverged from plan; planned-path counterfactual effect cannot be determined reliably. Legacy ENT-D failure evidence present."
    );
  }

  const dqOk = dq === "supported" || dq === "weakly_supported";
  const eqOk = eq === "respected" || eq === "not_applicable";

  if (dqOk && eqOk && polarity === "favorable") {
    return {
      planId,
      classification: { kind: "entry_family", value: "A" },
      equationId: EQ.ENT_A,
      inputsUsed: inputs,
      missingInputs: missing,
      reason: "Desired participation: supported decision, respected execution, favorable outcome facts.",
    };
  }

  if (dqOk && eqOk && polarity === "adverse") {
    return {
      planId,
      classification: { kind: "entry_family", value: "C" },
      equationId: EQ.ENT_C,
      inputsUsed: inputs,
      missingInputs: missing,
      reason:
        "Valid participation with adverse outcome — loss does not prove bad Entry decision.",
    };
  }

  if (polarity === "unknown") missing.push("outcome_polarity");
  if (dq === "INDETERMINATE") missing.push("decision_quality");
  if (eq === "INDETERMINATE") missing.push("execution_quality");

  return {
    planId,
    classification: { kind: "entry_family", value: "INDETERMINATE" },
    equationId: EQ.ENT_INDETERMINATE,
    inputsUsed: inputs,
    missingInputs: missing,
    reason: "Insufficient variables for A/C/D family assignment.",
  };
}

export function diagnoseCase(input: {
  thesisCase: ThesisCase;
  evaluation: CaseEvaluation;
  participation?: CaseParticipationClass | null;
  /** Planned/counterfactual R when evaluable — never treated as portfolio P/L. */
  counterfactualR?: number | null;
}): CaseDiagnosis {
  const c = input.thesisCase;
  const planId = c.identity.anchorPlanId;
  const participation =
    input.participation ?? participationFromVerdict(verdictOf(c));
  const counterfactualR = input.counterfactualR;

  if (participation === "no_entry") {
    return diagnoseNoEntry(planId, c, input.evaluation, counterfactualR);
  }
  if (participation === "entry") {
    return diagnoseEntry(planId, c, input.evaluation, counterfactualR);
  }
  if (participation === "probe") {
    return {
      planId,
      classification: { kind: "probe", value: "INDETERMINATE" },
      equationId: EQ.PROBE,
      inputsUsed: [
        evidence("participation", "probe", `verdict=${verdictOf(c)}`),
      ],
      missingInputs: ["probe_family_contract"],
      reason: "Probe participation — no sealed family equation yet.",
    };
  }
  return {
    planId,
    classification: { kind: "unclassified", value: "INDETERMINATE" },
    equationId: EQ.UNCLASSIFIED,
    inputsUsed: [],
    missingInputs: ["participation"],
    reason: "Participation class unavailable.",
  };
}

function rate(n: number, denom: number): number | null {
  if (denom <= 0) return null;
  return n / denom;
}

export function evaluateFalseVirtuousLoop(input: {
  totalCases: number;
  entryCases: number;
  noEntryCases: number;
  goodFilter: number;
  overOptimization: number;
  indeterminateNoEntry: number;
}): FalseVirtuousLoopState {
  const {
    totalCases,
    entryCases,
    noEntryCases,
    goodFilter,
    overOptimization,
    indeterminateNoEntry,
  } = input;
  const noEntryDiagnosedDenom = goodFilter + overOptimization + indeterminateNoEntry;
  const entryRate = rate(entryCases, totalCases);
  const noEntryRate = rate(noEntryCases, totalCases);
  const overOptRate = rate(overOptimization, noEntryDiagnosedDenom);
  const goodFilterRate = rate(goodFilter, noEntryDiagnosedDenom);

  const baseInputs = {
    totalCases,
    entryCases,
    noEntryCases,
    entryRate,
    noEntryRate,
    goodFilter,
    overOptimization,
    indeterminateNoEntry,
    noEntryDiagnosedDenom,
  };

  // High no-entry alone never triggers.
  if (totalCases === 0 || noEntryCases === 0) {
    return {
      suspected: false,
      equationId: EQ.FVL,
      reason: "No no-entry universe — false-virtuous-loop not applicable.",
      inputs: baseInputs,
    };
  }

  if (
    entryRate != null &&
    entryRate <= 0.1 &&
    overOptRate != null &&
    overOptRate >= 0.35 &&
    overOptimization >= 2
  ) {
    return {
      suspected: true,
      equationId: EQ.FVL,
      reason:
        "Low participation with material Over-optimization share among diagnosed no-entries — possible false-virtuous (over-filtering) loop.",
      inputs: baseInputs,
    };
  }

  if (
    goodFilterRate != null &&
    goodFilterRate >= 0.6 &&
    (overOptRate == null || overOptRate < 0.2)
  ) {
    return {
      suspected: false,
      equationId: EQ.FVL,
      reason:
        "No-entry universe dominated by Good Filter — high no-entry rate alone is not failure.",
      inputs: baseInputs,
    };
  }

  return {
    suspected: false,
    equationId: EQ.FVL,
    reason:
      "Insufficient pattern for false-virtuous-loop suspicion (high no-entry alone is not failure).",
    inputs: baseInputs,
  };
}

export function buildCurrentCondition(input: {
  totalCases: number;
  entryCases: number;
  missingT0Cases: number;
  aggregate: Omit<
    DiagnosisAggregate,
    "available" | "byPlanId" | "currentCondition" | "falseVirtuousLoop" | "rates"
  > & {
    rates: DiagnosisAggregate["rates"];
    falseVirtuousLoop: FalseVirtuousLoopState;
  };
}): DiagnosisAggregate["currentCondition"] {
  const { totalCases, entryCases, missingT0Cases, aggregate } = input;
  if (totalCases === 0) {
    return {
      code: "EMPTY",
      statement: "Sin casos con decisión Scout comprometida en el universo actual.",
    };
  }
  if (missingT0Cases / totalCases >= 0.5) {
    return {
      code: "INSUFFICIENT_EVIDENCE",
      statement: `Evidencia insuficiente: ${missingT0Cases}/${totalCases} casos sin T0 usable. Diagnósticos no-entry permanecen indeterminados donde falta T0.`,
    };
  }
  if (aggregate.falseVirtuousLoop.suspected) {
    return {
      code: "POSSIBLE_OVER_FILTERING",
      statement: `Posible sobre-filtrado: participación baja (${entryCases}/${totalCases}) con sobre-optimización material en no-entradas.`,
    };
  }
  const ne = aggregate.noEntryUniverse;
  if (
    ne > 0 &&
    aggregate.rates.goodFilterRate != null &&
    aggregate.rates.goodFilterRate >= 0.5 &&
    (aggregate.rates.overOptimizationRate ?? 0) < 0.25
  ) {
    return {
      code: "FILTERING_DOMINANT_GOOD",
      statement: `Filtrado dominante con Good Filter (${aggregate.goodFilter}/${ne}). Alta no-entrada no implica fallo.`,
    };
  }
  if (entryCases > 0 && entryCases / totalCases >= 0.2) {
    return {
      code: "PARTICIPATING",
      statement: `Participación activa: ${entryCases} entradas / ${totalCases} casos. Revisar familias A–D donde la evidencia alcanza.`,
    };
  }
  return {
    code: "MIXED",
    statement: `Universo mixto: ${entryCases} entradas, ${aggregate.noEntryUniverse} no-entradas (${aggregate.goodFilter} good filter · ${aggregate.overOptimization} sobre-opt · ${aggregate.indeterminateNoEntry} indeterminadas).`,
  };
}

export function aggregateDiagnoses(input: {
  diagnoses: CaseDiagnosis[];
  totalCases: number;
  entryCases: number;
  noEntryCases: number;
  missingT0Cases: number;
}): DiagnosisAggregate {
  let goodFilter = 0;
  let overOptimization = 0;
  let indeterminateNoEntry = 0;
  let entryFamilyA = 0;
  let entryFamilyC = 0;
  let entryFamilyD = 0;
  let entryFamilyIndeterminate = 0;
  let noEntryUniverse = 0;
  let entryUniverse = 0;
  const byPlanId: Record<string, CaseDiagnosis> = {};

  for (const d of input.diagnoses) {
    byPlanId[d.planId] = d;
    if (d.classification.kind === "no_entry") {
      noEntryUniverse += 1;
      const v = d.classification.value as NoEntryDiagnosisClass;
      if (v === "GOOD_FILTER") goodFilter += 1;
      else if (v === "OVER_OPTIMIZATION") overOptimization += 1;
      else indeterminateNoEntry += 1;
    } else if (d.classification.kind === "case_d") {
      // D1–D6 are Case D (plan divergence) — product family D.
      // D1–D3 remain no-fill participation; D4–D6 are deficient execution.
      entryUniverse += 1;
      entryFamilyD += 1;
    } else if (d.classification.kind === "entry_family") {
      entryUniverse += 1;
      const v = d.classification.value as EntryCaseFamily;
      if (v === "A") entryFamilyA += 1;
      else if (v === "C") entryFamilyC += 1;
      else if (v === "D") entryFamilyD += 1;
      else entryFamilyIndeterminate += 1;
    }
  }

  const falseVirtuousLoop = evaluateFalseVirtuousLoop({
    totalCases: input.totalCases,
    entryCases: input.entryCases,
    noEntryCases: input.noEntryCases,
    goodFilter,
    overOptimization,
    indeterminateNoEntry,
  });

  const rates = {
    goodFilterRate: rate(goodFilter, noEntryUniverse),
    overOptimizationRate: rate(overOptimization, noEntryUniverse),
    indeterminateNoEntryRate: rate(indeterminateNoEntry, noEntryUniverse),
    entryFamilyARate: rate(entryFamilyA, entryUniverse),
    entryFamilyCRate: rate(entryFamilyC, entryUniverse),
    entryFamilyDRate: rate(entryFamilyD, entryUniverse),
  };

  const partial = {
    noEntryUniverse,
    entryUniverse,
    goodFilter,
    overOptimization,
    indeterminateNoEntry,
    entryFamilyA,
    entryFamilyC,
    entryFamilyD,
    entryFamilyIndeterminate,
    rates,
    falseVirtuousLoop,
  };

  const currentCondition = buildCurrentCondition({
    totalCases: input.totalCases,
    entryCases: input.entryCases,
    missingT0Cases: input.missingT0Cases,
    aggregate: partial,
  });

  return {
    available: true,
    ...partial,
    currentCondition,
    byPlanId,
  };
}
