/**
 * Confirm before Tag ↔ Tracker convert (Flag / Disable).
 * Tracker changes are journal-wide — easy to misfire on a chip click.
 */
export function confirmTrackerConvert(tag: string, currentlyFlagged: boolean): boolean {
  const name = tag.trim() || "this Tag";
  if (typeof window === "undefined") return false;
  if (currentlyFlagged) {
    return window.confirm(
      `Disable Tracker on “${name}”?\n\nThe Tag stays on Notes and Topics. This only turns off journal-wide watch — you can Flag it again anytime.`
    );
  }
  return window.confirm(
    `Flag “${name}” as a Tracker?\n\nTrackers are journal-wide — you’ll watch this Tag across Events and Topics. The Tag itself is unchanged.`
  );
}
