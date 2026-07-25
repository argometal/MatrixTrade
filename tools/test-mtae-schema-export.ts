/**
 * technical-assessment AI contract export ↔ runtime validator alignment.
 * Run: npm run test:mtae-schema-export
 */
import assert from "node:assert/strict";
import {
  TECHNICAL_ASSESSMENT_MIN_EXAMPLE,
  AI_BLOCK_SAMPLES,
} from "../lib/ai-block";
import {
  TECHNICAL_ASSESSMENT_REQUIRED_PATHS,
  buildApplySchemaContract,
  buildTechnicalAssessmentContractSection,
} from "../lib/apply-schema-contract";
import { buildMtaeProtocolBrief } from "../lib/mtae-brief";
import { mtaeControlSnapshotItems } from "../lib/mtae-snapshot";
import { validateTechnicalAssessmentProposal } from "../lib/mtae-validate";
import {
  MTAE_DOMINANT_CONDITIONS,
  MTAE_EXPANSION_POTENTIALS,
  MTAE_EXPANSION_STATES,
  MTAE_MOMENTUM_CURRENT_STATES,
  MTAE_SCOUT_IMPLICATIONS,
} from "../lib/mtae-types";

const contract = buildApplySchemaContract();

// 1. All required nested paths exported
for (const path of TECHNICAL_ASSESSMENT_REQUIRED_PATHS) {
  assert.ok(
    contract.requiredFields["technical-assessment"].includes(path),
    `requiredFields missing ${path}`
  );
  assert.ok(
    contract.technicalAssessment.required.includes(path),
    `technicalAssessment.required missing ${path}`
  );
}

const mustHave = [
  "perTimeframe[].trend",
  "perTimeframe[].summary",
  "perTimeframe[].structuralInvalidation",
  "integrated.structureSpine",
  "integrated.opportunityNote",
  "integrated.executionContext",
  "technicalSummary.structureNote",
  "technicalSummary.trend",
  "technicalSummary.structuralInvalidation",
];
for (const path of mustHave) {
  assert.ok(
    contract.requiredFields["technical-assessment"].includes(path),
    `checklist path missing: ${path}`
  );
}

// 2. Critical enum arrays equal mtae-types consts
assert.deepEqual(
  contract.allowedEnums["momentumAssessment.expansionPotential"],
  [...MTAE_EXPANSION_POTENTIALS]
);
assert.deepEqual(
  contract.allowedEnums["momentumAssessment.currentState"],
  [...MTAE_MOMENTUM_CURRENT_STATES]
);
assert.deepEqual(
  contract.allowedEnums["momentumAssessment.scoutImplication"],
  [...MTAE_SCOUT_IMPLICATIONS]
);
assert.deepEqual(
  contract.allowedEnums["participationSynthesis.dominantCondition"],
  [...MTAE_DOMINANT_CONDITIONS]
);
assert.deepEqual(contract.allowedEnums["movementCharacter.state"], [...MTAE_EXPANSION_STATES]);
assert.notDeepEqual(
  contract.allowedEnums["momentumAssessment.currentState"],
  contract.allowedEnums["movementCharacter.state"],
  "currentState and movementCharacter.state must remain distinct enums"
);

// Contract exposes minimum example (not the rich demo as the primary example)
assert.equal(contract.examples["technical-assessment"], TECHNICAL_ASSESSMENT_MIN_EXAMPLE);
assert.equal(
  contract.richExamples?.["technical-assessment"],
  AI_BLOCK_SAMPLES["technical-assessment"]
);
assert.notEqual(
  JSON.stringify(TECHNICAL_ASSESSMENT_MIN_EXAMPLE),
  JSON.stringify(AI_BLOCK_SAMPLES["technical-assessment"]),
  "min example must stay distinct from rich sample"
);

// 3. Minimum example passes validator
{
  const proposal = TECHNICAL_ASSESSMENT_MIN_EXAMPLE.proposal as Record<string, unknown>;
  const ok = validateTechnicalAssessmentProposal(proposal);
  assert.equal(ok.ok, true, `min example failed: ${ok.ok === false ? ok.errors.join("; ") : ""}`);
}

// 4. Removing required nested fields causes validation failure
function cloneProposal(): Record<string, unknown> {
  return structuredClone(TECHNICAL_ASSESSMENT_MIN_EXAMPLE.proposal) as Record<string, unknown>;
}

{
  const cases: Array<{ label: string; mutate: (p: Record<string, unknown>) => void }> = [
    {
      label: "structureSpine",
      mutate: (p) => {
        (p.integrated as Record<string, unknown>).structureSpine = "";
      },
    },
    {
      label: "opportunityNote",
      mutate: (p) => {
        (p.integrated as Record<string, unknown>).opportunityNote = "";
      },
    },
    {
      label: "executionContext",
      mutate: (p) => {
        (p.integrated as Record<string, unknown>).executionContext = "";
      },
    },
    {
      label: "perTimeframe summary",
      mutate: (p) => {
        const tf = (p.perTimeframe as Record<string, unknown>[])[0];
        tf.summary = "";
      },
    },
    {
      label: "perTimeframe trend",
      mutate: (p) => {
        const tf = (p.perTimeframe as Record<string, unknown>[])[0];
        delete tf.trend;
      },
    },
    {
      label: "perTimeframe structuralInvalidation",
      mutate: (p) => {
        const tf = (p.perTimeframe as Record<string, unknown>[])[0];
        tf.structuralInvalidation = "";
      },
    },
    {
      label: "technicalSummary.structureNote",
      mutate: (p) => {
        (p.technicalSummary as Record<string, unknown>).structureNote = "";
      },
    },
  ];

  for (const c of cases) {
    const p = cloneProposal();
    c.mutate(p);
    const result = validateTechnicalAssessmentProposal(p);
    assert.equal(result.ok, false, `expected failure when removing ${c.label}`);
  }
}

// 5. capitalEfficiencyConcern rejects string, accepts boolean
{
  const withMomentum = cloneProposal();
  (withMomentum.integrated as Record<string, unknown>).momentumAssessment = {
    expansionPotential: "moderate",
    currentState: "constructive_compression",
    capitalEfficiencyConcern: "true",
    rationale: ["test"],
    scoutImplication: "require_better_entry",
    confidence: 60,
  };
  const bad = validateTechnicalAssessmentProposal(withMomentum);
  assert.equal(bad.ok, false, "string capitalEfficiencyConcern must fail");
  assert.ok(
    bad.ok === false &&
      bad.errors.some((e) => e.includes("capitalEfficiencyConcern") && e.includes("boolean"))
  );

  const goodProposal = cloneProposal();
  (goodProposal.integrated as Record<string, unknown>).momentumAssessment = {
    expansionPotential: "moderate",
    currentState: "constructive_compression",
    capitalEfficiencyConcern: true,
    rationale: ["test"],
    scoutImplication: "require_better_entry",
    confidence: 60,
  };
  const good = validateTechnicalAssessmentProposal(goodProposal);
  assert.equal(
    good.ok,
    true,
    `boolean capitalEfficiencyConcern must pass: ${good.ok === false ? good.errors.join("; ") : ""}`
  );
}

// 6. MTAE brief includes required nested keys
{
  const brief = buildMtaeProtocolBrief([]);
  for (const key of [
    "structureSpine",
    "opportunityNote",
    "executionContext",
    "structureNote",
    "perTimeframe[].trend",
    "perTimeframe[].summary",
    "perTimeframe[].structuralInvalidation",
    "APPLY JSON CONTRACT",
  ]) {
    assert.ok(brief.includes(key), `mtae brief missing ${key}`);
  }
}

// 7. MTAE snapshot exists and contains technical-assessment example
{
  const items = mtaeControlSnapshotItems([]);
  const snap = items.find((i) => i.id === "mtae-technical-assessment-contract");
  assert.ok(snap, "mtae-technical-assessment-contract snapshot missing");
  assert.ok(snap!.text.includes("technical-assessment"));
  assert.ok(snap!.text.includes("ST-EXAMPLE-001") || snap!.text.includes('"type": "technical-assessment"'));
  assert.ok(snap!.text.includes("structureSpine"));
  assert.ok(buildTechnicalAssessmentContractSection().includes("MINIMUM VALID EXAMPLE"));
}

console.log("test-mtae-schema-export: all assertions passed");
