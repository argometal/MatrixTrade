/** Event entity shell — chronicle entries live in linked logs (see event-chronicle.ts). */

const KIND_PREFIX = /^Kind:\s*Event\s*\n?/i;
const LEGACY_PURPOSE_LINE = /^Purpose:\s*(hr|performance|incident|general)\s*$/gim;
const CHRONICLE_V2_MARKER = /^Chronicle:\s*v2\s*$/gim;
const HR_LINE = /^---\s*$/gm;

/**
 * Extract legacy narrative still stored on the event entity (pre–Chronicle v2).
 * Strips Kind / Purpose / Chronicle marker / horizontal rules.
 * Separator-only leftovers → empty (no migrate).
 */
export function parseEventRecord(notes: string): { record: string } {
  const stripped = notes.replace(KIND_PREFIX, "").trim();
  const record = stripped
    .replace(LEGACY_PURPOSE_LINE, "")
    .replace(CHRONICLE_V2_MARKER, "")
    .replace(HR_LINE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { record };
}
