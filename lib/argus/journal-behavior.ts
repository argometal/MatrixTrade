import type { JournalKind, Log } from "./types";

/** UI entry type — maps to stored journal kinds without schema changes. */
export type JournalEntryType = "note" | "log";

/** Stored kinds that represent a standalone note (not a sequence log). */
export function isJournalNoteKind(kind: JournalKind): boolean {
  return kind === "event" || kind === "follow_up";
}

export function isJournalLogKind(kind: JournalKind): boolean {
  return kind === "log";
}

export function journalEntryType(log: Pick<Log, "kind">): JournalEntryType {
  return isJournalLogKind(log.kind) ? "log" : "note";
}

export function canConvertNoteToLog(log: Pick<Log, "kind">): boolean {
  return isJournalNoteKind(log.kind);
}

export function canExtractLogToNote(log: Pick<Log, "kind">): boolean {
  return isJournalLogKind(log.kind);
}

/** Log cannot convert directly into another log — only in-place edits keep kind=log. */
export function canCreateLinkedLogFromEntry(log: Pick<Log, "kind">): boolean {
  return isJournalNoteKind(log.kind);
}

export class JournalBehaviorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JournalBehaviorError";
  }
}

/**
 * Allowed kind changes on update:
 * - note → log (convert)
 * - note ↔ note (event/follow_up edits)
 * - log → log (edit in place)
 * - log → note: blocked — use extractLogToNote
 */
export function assertJournalKindTransition(from: JournalKind, to: JournalKind): void {
  if (from === to) return;

  if (isJournalNoteKind(from) && to === "log") return;
  if (isJournalNoteKind(from) && isJournalNoteKind(to)) return;

  if (from === "log" && to === "log") return;

  if (from === "log") {
    throw new JournalBehaviorError(
      "A log entry cannot become a note in place. Extract it to a standalone note first."
    );
  }

  throw new JournalBehaviorError("This journal type change is not allowed.");
}
