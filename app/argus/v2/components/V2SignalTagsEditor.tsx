"use client";

/**
 * @deprecated Prefer `V2TrackerTogglePanel` — Flag / Disable Tracker without delete.
 * Kept as a thin wrapper so older imports keep working.
 */
import { V2TrackerTogglePanel } from "./V2TrackerTogglePanel";

export function V2SignalTagsEditor({
  initialTags,
  compact: _compact = false,
}: {
  initialTags: string[];
  returnTo?: string;
  compact?: boolean;
}) {
  return (
    <V2TrackerTogglePanel
      evidenceTags={[]}
      signalTags={initialTags}
      heading="Trackers (click to Flag / Disable)"
      hint="Flag / Disable Tracker only — never deletes Tags from Notes."
      addPlaceholder="Tag name → Flag as Tracker"
    />
  );
}
