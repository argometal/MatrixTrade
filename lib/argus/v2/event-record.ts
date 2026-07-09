/** Event record + legal purpose — stored in Entity.notes without schema change. */

export type EventLegalPurpose = "hr" | "performance" | "incident" | "general";

export const EVENT_LEGAL_PURPOSES: { id: EventLegalPurpose; label: string }[] = [
  { id: "hr", label: "HR / workplace" },
  { id: "performance", label: "Performance record" },
  { id: "incident", label: "Incident" },
  { id: "general", label: "General documentation" },
];

const KIND_PREFIX = /^Kind:\s*Event\s*\n?/i;
const PURPOSE_LINE = /^Purpose:\s*(hr|performance|incident|general)\s*$/im;

export function parseEventRecord(notes: string): { purpose: EventLegalPurpose; record: string } {
  const stripped = notes.replace(KIND_PREFIX, "").trim();
  const purposeMatch = stripped.match(PURPOSE_LINE);
  const purpose = (purposeMatch?.[1]?.toLowerCase() ?? "general") as EventLegalPurpose;
  const record = stripped
    .replace(PURPOSE_LINE, "")
    .replace(/^---\s*\n?/, "")
    .trim();
  return { purpose, record };
}

export function buildEventRecordNotes(purpose: EventLegalPurpose, record: string): string {
  const body = record.trim();
  return body
    ? `Kind: Event\nPurpose: ${purpose}\n---\n${body}`
    : `Kind: Event\nPurpose: ${purpose}\n---`;
}

export function eventPurposeLabel(purpose: EventLegalPurpose): string {
  return EVENT_LEGAL_PURPOSES.find((p) => p.id === purpose)?.label ?? "General documentation";
}
