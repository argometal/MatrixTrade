/** Explicit list selection from URL or server prop — never auto-pick first row. */
export function resolveV2SelectedId(
  urlSelected: string | null | undefined,
  initialSelectedId?: string
): string | undefined {
  const explicit = urlSelected ?? initialSelectedId;
  return explicit || undefined;
}

export function v2ActiveListItemClass(isActive: boolean): string {
  return isActive
    ? "border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/30"
    : "border-zinc-800/80 bg-zinc-900/20";
}

export function v2ActiveTableRowClass(isActive: boolean): string {
  return isActive ? "bg-violet-500/10 ring-1 ring-inset ring-violet-500/35" : "";
}
