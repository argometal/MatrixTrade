/**
 * Apply Clear / Snap Failure helpers (Prompt ID 24-47).
 * Run: npm run test:apply-failure-snapshot
 */
import assert from "node:assert/strict";
import {
  applyAttemptClearsInput,
  buildApplyFailureRecord,
  classifyApplyFailureStage,
  detectBlockTypeFromRaw,
  extractFieldPathFromErrors,
  formatApplyFailureSnapshot,
} from "../lib/apply-failure-snapshot";

// Success path: Apply attempt always clears input (contract)
assert.equal(applyAttemptClearsInput(), true);

// Parse failure
{
  const record = buildApplyFailureRecord({
    submittedJson: "{ not json",
    kind: "parse",
    errorMessage: "Invalid JSON. Paste plain JSON or a ```json fenced block.",
    timestamp: "2026-07-25T12:00:00.000Z",
  });
  assert.equal(record.validationStage, "parse");
  assert.equal(record.blockType, "unknown");
  const snap = formatApplyFailureSnapshot(record);
  assert.ok(snap.includes("=== MTA APPLY FAILURE SNAPSHOT ==="));
  assert.ok(snap.includes("validationStage: parse"));
  assert.ok(snap.includes("{ not json"));
  assert.ok(snap.includes("=== END FAILURE SNAPSHOT ==="));
}

// Schema / validation failure with multiple details + field path
{
  const details = [
    "proposal.decisionConfidence must be 0-100",
    "challenges[] required (min 1)",
  ];
  assert.equal(extractFieldPathFromErrors(details), "proposal.decisionConfidence");
  assert.equal(
    classifyApplyFailureStage({
      kind: "validation",
      errorMessage: "Validation failed",
      details: ["timeframeRoles.strategic_tf must be one of: 6M, 3M"],
    }),
    "schema"
  );

  const record = buildApplyFailureRecord({
    submittedJson: JSON.stringify(
      {
        type: "decision-update",
        proposal: { planId: "PLAN-1", decisionConfidence: "high" },
      },
      null,
      2
    ),
    kind: "parse",
    errorMessage: "Validation failed",
    details,
    timestamp: "2026-07-25T12:00:00.000Z",
  });
  assert.equal(record.validationStage, "validation");
  assert.equal(record.blockType, "decision-update");
  assert.equal(record.fieldPath, "proposal.decisionConfidence");
  assert.equal(record.validatorDetails.length, 2);
  const snap = formatApplyFailureSnapshot(record);
  assert.ok(snap.includes("proposal.decisionConfidence must be 0-100"));
  assert.ok(snap.includes("challenges[] required (min 1)"));
  assert.ok(snap.includes('"type": "decision-update"'));
}

// Detect block type from fenced JSON
assert.equal(
  detectBlockTypeFromRaw('```json\n{"type":"technical-assessment","proposal":{}}\n```'),
  "technical-assessment"
);

// Server / persistence failure
{
  const server = buildApplyFailureRecord({
    submittedJson: '{"type":"trade-proposal","proposal":{"id":"H1"}}',
    kind: "server",
    errorMessage: "Supabase write failed",
    blockType: "trade-proposal",
    timestamp: "2026-07-25T12:00:00.000Z",
  });
  assert.equal(server.validationStage, "persistence");

  const genericServer = buildApplyFailureRecord({
    submittedJson: '{"type":"file-update","proposal":{"id":"ST-1"}}',
    kind: "server",
    errorMessage: "Apply failed",
    blockType: "file-update",
  });
  assert.equal(genericServer.validationStage, "server");
}

// Unexpected
{
  const record = buildApplyFailureRecord({
    submittedJson: '{"type":"decision-update","proposal":{}}',
    kind: "unexpected",
    errorMessage: "boom",
    technicalNote: "Error: boom\n    at handleAccept",
  });
  assert.equal(record.validationStage, "unexpected");
  assert.ok(formatApplyFailureSnapshot(record).includes("technicalNote:"));
}

// Failure snapshot retains exact submitted JSON (not lost before format)
{
  const payload = '{"type":"scout-plan-create","proposal":{"ticker":"SHOP"}}';
  const record = buildApplyFailureRecord({
    submittedJson: payload,
    kind: "validation",
    errorMessage: "Validation failed",
    details: ["plannedEntry required", "stopPrice required"],
  });
  assert.equal(record.submittedJson, payload);
  assert.ok(formatApplyFailureSnapshot(record).includes(payload));
}

console.log("test-apply-failure-snapshot: all assertions passed");
