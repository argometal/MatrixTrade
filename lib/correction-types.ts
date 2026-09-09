/**
 * MXT correction / repair contract (029).
 * Historical truth is protected from hindsight; recorded errors remain repairable.
 * A correction may change the effective/canonical value; prior values stay in audit.
 */

export const RECORD_KINDS = ["original", "reconstructed", "corrected"] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];

export const CORRECTION_KINDS = ["updated"] as const;
export type CorrectionKind = (typeof CORRECTION_KINDS)[number];
export type LegacyCorrectionKind = "reconstructed" | "corrected" | CorrectionKind;

/** Append-only provenance for a repair that changed the effective record. */
export type CorrectionAuditEntry = {
  at: string;
  kind: LegacyCorrectionKind;
  note: string;
  evidenceRefs?: string[];
  mechanism: string;
  /** Prior effective payload (JSON-serializable snapshot). */
  previous: Record<string, unknown>;
};

export function appendCorrectionAudit(
  existing: CorrectionAuditEntry[] | null | undefined,
  entry: CorrectionAuditEntry
): CorrectionAuditEntry[] {
  return [...(existing ?? []), entry];
}
