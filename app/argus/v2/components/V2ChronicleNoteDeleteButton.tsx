"use client";

import { deleteLogAction } from "@/app/argus/actions";

/** Soft-delete a chronicle Note (Log) from event/topic/network surfaces. */
export function V2ChronicleNoteDeleteButton({
  logId,
  returnTo,
  label = "Delete",
}: {
  logId: string;
  returnTo: string;
  label?: string;
}) {
  return (
    <form
      action={deleteLogAction}
      onSubmit={(event) => {
        if (
          !confirm(
            "Delete this note from the chronicle? Soft-delete — recoverable from backup only. Attachments are removed."
          )
        ) {
          event.preventDefault();
        }
      }}
      className="shrink-0"
      onClick={(event) => event.stopPropagation()}
    >
      <input type="hidden" name="logId" value={logId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        className="rounded-lg border border-red-900/50 bg-red-950/25 px-2 py-1 text-[10px] font-medium text-red-300/90 hover:bg-red-950/45"
      >
        {label}
      </button>
    </form>
  );
}

/** Extract log id from evidence stream id `journal-{uuid}`. */
export function chronicleLogIdFromEvidenceId(evidenceId: string): string | null {
  if (!evidenceId.startsWith("journal-")) return null;
  return evidenceId.slice("journal-".length) || null;
}
