import type { MafComponentAttribution, MafObservableEvidence } from "./maf-types";

/**
 * Deterministic inference hints from measurable evidence.
 * These are rule suggestions — not final attribution. AI/human still Accept.
 */
export function inferMafRuleHints(
  evidence: MafObservableEvidence
): MafComponentAttribution[] {
  const hints: MafComponentAttribution[] = [];

  if (
    evidence.exitReason === "stop" &&
    evidence.targetReachedAfterStop === true &&
    evidence.thesisInvalidated !== true
  ) {
    hints.push({
      component: "stop_quality",
      classification: "weak",
      tag: "stop_too_tight",
      aiInterpretationConfidence: 85,
      reasoning:
        "Rule: stop hit AND target reached after stop AND thesis not invalidated → evidence stop may be too tight.",
      suggestedImprovement:
        "Consider widening strategy stop toward structural invalidation when planned R still qualifies.",
      evidenceRefs: ["exitReason", "targetReachedAfterStop", "thesisInvalidated"],
    });
    hints.push({
      component: "thesis_quality",
      classification: "good",
      tag: "thesis_later_validated",
      aiInterpretationConfidence: 75,
      reasoning:
        "Rule: target reached after stop without thesis invalidation → thesis path likely remained valid.",
      evidenceRefs: ["targetReachedAfterStop", "thesisInvalidated"],
    });
  }

  if (
    evidence.fillStatus === "filled" &&
    evidence.slippageVsPlan !== undefined &&
    evidence.slippageVsPlan > 0 &&
    Math.abs(evidence.slippageVsPlan) /
      Math.max(Math.abs(evidence.plannedEntry ?? evidence.executedEntry ?? 1), 1) >
      0.01
  ) {
    hints.push({
      component: "entry_quality",
      classification: "weak",
      tag: "chased_above_plan",
      aiInterpretationConfidence: 65,
      reasoning: `Rule: executed entry ${evidence.executedEntry} vs planned ${evidence.plannedEntry} (slip ${evidence.slippageVsPlan}) suggests chase / late entry.`,
      suggestedImprovement: "Wait for planned zone; do not chase confirmation.",
      evidenceRefs: ["plannedEntry", "executedEntry", "slippageVsPlan"],
    });
  }

  if (evidence.fillStatus === "missed" || evidence.fillStatus === "cancelled") {
    hints.push({
      component: "timing_quality",
      classification: "inconclusive",
      tag: "no_fill",
      aiInterpretationConfidence: 50,
      reasoning:
        "Rule: no fill — timing/capital/discipline may dominate; wait for observation of target vs invalidation without capital.",
      evidenceRefs: ["fillStatus"],
    });
  }

  if (evidence.lossClassification === "execution_error") {
    hints.push({
      component: "execution_quality",
      classification: "failure",
      tag: "execution_error",
      aiInterpretationConfidence: 80,
      reasoning: "Rule: lossClassification=execution_error maps to execution_quality failure.",
      evidenceRefs: ["lossClassification"],
    });
  }

  return hints;
}
