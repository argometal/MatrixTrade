/**
 * Manage List · rows orientation for Tags inventories.
 * Match Organizations browse List rows (vertical stack, full-width).
 */
export const TAG_MANAGE_LIST_CLASS = "space-y-2";

/** Full-width Manage-style row (same family as OrganizationListRow). */
export const TAG_MANAGE_ROW_CLASS =
  "flex w-full items-center gap-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-left text-sm transition hover:border-violet-500/30 hover:bg-zinc-900/70";

export const TAG_MANAGE_ROW_ACTIVE_CLASS =
  "flex w-full items-center gap-4 rounded-xl border border-violet-500/40 bg-violet-950/40 px-4 py-3 text-left text-sm text-violet-100 transition hover:border-violet-400/50 hover:bg-violet-950/55";

export const TAG_MANAGE_ROW_TRACKER_CLASS =
  "flex w-full items-center gap-4 rounded-xl border border-amber-400/60 bg-rose-950/50 px-4 py-3 text-left text-sm font-semibold text-amber-100 transition hover:bg-rose-950/70";

export const TAG_MANAGE_ROW_LABEL = "min-w-0 flex-1 truncate font-semibold text-zinc-100";
