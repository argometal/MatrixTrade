/** Explicit list selection from URL — never auto-pick first row.
 * URL is source of truth so Back (clearing ?selected=) cannot be undone by
 * stale SSR `initialSelectedId` props.
 */
export function resolveV2SelectedId(
  urlSelected: string | null | undefined,
  initialSelectedId?: string
): string | undefined {
  if (urlSelected != null) {
    const trimmed = urlSelected.trim();
    return trimmed || undefined;
  }
  // Caller omitted URL (undefined only) — allow SSR initial for first paint helpers.
  return initialSelectedId || undefined;
}

export function v2ActiveListItemClass(isActive: boolean): string {
  return isActive
    ? "border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/30"
    : "border-zinc-800/80 bg-zinc-900/20";
}

export function v2ActiveTableRowClass(isActive: boolean): string {
  return isActive ? "bg-violet-500/10 ring-1 ring-inset ring-violet-500/35" : "";
}
