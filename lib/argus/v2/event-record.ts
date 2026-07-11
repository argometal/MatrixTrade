/** Event notes body — stored in Entity.notes; tags live in Entity.linkedTags. */

const KIND_PREFIX = /^Kind:\s*Event\s*\n?/i;
const LEGACY_PURPOSE_LINE = /^Purpose:\s*(hr|performance|incident|general)\s*$/im;

export function parseEventRecord(notes: string): { record: string } {
  const stripped = notes.replace(KIND_PREFIX, "").trim();
  const record = stripped
    .replace(LEGACY_PURPOSE_LINE, "")
    .replace(/^---\s*\n?/, "")
    .trim();
  return { record };
}

export function buildEventRecordNotes(record: string): string {
  const body = record.trim();
  return body ? `Kind: Event\n---\n${body}` : `Kind: Event\n---`;
}
