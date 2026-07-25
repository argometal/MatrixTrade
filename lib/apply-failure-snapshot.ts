/**
 * Apply failure snapshot — UI reporting only (Prompt ID 24-47).
 * Does not change validators, schemas, or persistence.
 */

export type ApplyFailureStage =
  | "parse"
  | "schema"
  | "validation"
  | "persistence"
  | "server"
  | "unexpected";

export type ApplyFailureRecord = {
  timestamp: string;
  blockType: string;
  validationStage: ApplyFailureStage;
  errorMessage: string;
  fieldPath: string;
  receivedValue: string;
  validatorDetails: string[];
  submittedJson: string;
  technicalNote?: string;
};

const FIELD_PATH_RE =
  /\b((?:proposal\.)?[A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)+)\b/;

export function extractFieldPathFromErrors(errors: string[]): string {
  for (const err of errors) {
    const match = err.match(FIELD_PATH_RE);
    if (match?.[1]) return match[1];
  }
  return "";
}

export function extractReceivedValueHint(errors: string[]): string {
  for (const err of errors) {
    const got = err.match(/\bgot\s+([^.;]+)/i);
    if (got?.[1]) return got[1].trim();
    const received = err.match(/\breceived\s+([^.;]+)/i);
    if (received?.[1]) return received[1].trim();
  }
  return "";
}

export function detectBlockTypeFromRaw(raw: string): string {
  try {
    const trimmed = raw.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonText = (fenced?.[1] ?? trimmed).trim();
    const parsed = JSON.parse(jsonText) as { type?: unknown };
    if (typeof parsed?.type === "string" && parsed.type.trim()) {
      return parsed.type.trim();
    }
  } catch {
    /* ignore */
  }
  return "unknown";
}

export function classifyApplyFailureStage(input: {
  kind: "parse" | "validation" | "server" | "unexpected";
  errorMessage: string;
  details?: string[];
}): ApplyFailureStage {
  if (input.kind === "unexpected") return "unexpected";
  if (input.kind === "parse") {
    const blob = [input.errorMessage, ...(input.details ?? [])].join(" ").toLowerCase();
    if (blob.includes("invalid json") || blob.includes("empty") || blob.includes("could not read")) {
      return "parse";
    }
    if (blob.includes("validation failed") || (input.details?.length ?? 0) > 0) {
      return classifyValidationOrSchema(input.details ?? [input.errorMessage]);
    }
    return "parse";
  }
  if (input.kind === "validation") {
    return classifyValidationOrSchema(input.details ?? [input.errorMessage]);
  }
  // server / persistence
  const msg = input.errorMessage.toLowerCase();
  if (msg.includes("unexpected") || msg.includes("exception")) return "unexpected";
  if (
    msg.includes("persist") ||
    msg.includes("database") ||
    msg.includes("supabase") ||
    msg.includes("write")
  ) {
    return "persistence";
  }
  return "server";
}

function classifyValidationOrSchema(details: string[]): ApplyFailureStage {
  const blob = details.join(" ").toLowerCase();
  if (
    blob.includes("unknown key") ||
    blob.includes("invent") ||
    blob.includes("schema") ||
    blob.includes("allowed") ||
    blob.includes("must be one of")
  ) {
    return "schema";
  }
  return "validation";
}

export function buildApplyFailureRecord(input: {
  submittedJson: string;
  kind: "parse" | "validation" | "server" | "unexpected";
  errorMessage: string;
  details?: string[];
  blockType?: string;
  timestamp?: string;
  technicalNote?: string;
}): ApplyFailureRecord {
  const details = (input.details ?? []).map((d) => d.trim()).filter(Boolean);
  const allMessages = [input.errorMessage, ...details].filter(Boolean);
  return {
    timestamp: input.timestamp ?? new Date().toISOString(),
    blockType: input.blockType ?? detectBlockTypeFromRaw(input.submittedJson),
    validationStage: classifyApplyFailureStage({
      kind: input.kind,
      errorMessage: input.errorMessage,
      details,
    }),
    errorMessage: input.errorMessage.trim() || "Apply failed",
    fieldPath: extractFieldPathFromErrors(allMessages),
    receivedValue: extractReceivedValueHint(allMessages),
    validatorDetails: details,
    submittedJson: input.submittedJson,
    technicalNote: input.technicalNote?.trim() || undefined,
  };
}

export function formatApplyFailureSnapshot(record: ApplyFailureRecord): string {
  const details =
    record.validatorDetails.length > 0
      ? record.validatorDetails.map((d) => `- ${d}`).join("\n")
      : "(none)";

  return [
    "=== MTA APPLY FAILURE SNAPSHOT ===",
    `timestamp: ${record.timestamp}`,
    `blockType: ${record.blockType}`,
    `validationStage: ${record.validationStage}`,
    `errorMessage: ${record.errorMessage}`,
    `fieldPath: ${record.fieldPath || "(none)"}`,
    `receivedValue: ${record.receivedValue || "(none)"}`,
    "validatorDetails:",
    details,
    ...(record.technicalNote
      ? [`technicalNote: ${record.technicalNote}`]
      : []),
    "=== SUBMITTED JSON ===",
    record.submittedJson.trim() || "(empty)",
    "=== END FAILURE SNAPSHOT ===",
  ].join("\n");
}

/** Pure success cleanup decision — used by UI and tests. */
export function applyAttemptClearsInput(): true {
  return true;
}
