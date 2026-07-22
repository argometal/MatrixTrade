import assert from "node:assert/strict";
import { AI_BLOCK_SAMPLES } from "../lib/ai-block";
import { validateTechnicalAssessmentProposal } from "../lib/mtae-validate";
import {
  formatEvidenceFirstTimeframe,
  formatMtaeEvidenceFirstView,
  oneSentenceExplanation,
} from "../lib/mtae-evidence-format";

assert.equal(oneSentenceExplanation("First. Second."), "First.");
assert.ok((oneSentenceExplanation("x".repeat(200)) ?? "").endsWith("…"));

const sample = AI_BLOCK_SAMPLES["technical-assessment"] as {
  proposal: Record<string, unknown>;
};
const ok = validateTechnicalAssessmentProposal(sample.proposal);
assert.equal(ok.ok, true, ok.ok ? "" : (ok as { errors: string[] }).errors.join("; "));
if (!ok.ok) throw new Error("fail");

const assessment = {
  ...ok.value,
  id: "MTAE-TEST-001",
  createdAt: new Date().toISOString(),
};

const view = formatMtaeEvidenceFirstView(assessment, {
  profileNotes: "Study zone 120–125 if 130 lost.",
});
assert.ok(view.includes("EVIDENCE FIRST"));
assert.ok(view.includes("Supports:"));
assert.ok(view.includes("Resistances / Targets:"));
assert.ok(view.includes("Bias:"));
assert.ok(view.includes("Confidence:"));
assert.ok(view.indexOf("EVIDENCE FIRST") < view.indexOf("INTEGRATED"));
assert.ok(view.indexOf("INTEGRATED") < view.indexOf("PROFILE NOTES"));
assert.ok(view.includes("Overall Technical Thesis:"));
assert.ok(view.includes("Momentum Assessment"));
assert.ok(view.includes("Structural Risks:"));
assert.ok(view.includes("Study zone 120–125"));
assert.ok(view.includes("Scout owns"));

const tf0 = formatEvidenceFirstTimeframe(assessment.perTimeframe[0]);
assert.ok(tf0.supports.length > 0);
assert.ok(["bullish", "neutral", "bearish"].includes(tf0.bias));

console.log("mtae-evidence-first: ok");
