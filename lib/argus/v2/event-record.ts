/** Event entity shell — chronicle entries live in linked logs (see event-chronicle.ts). */

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
