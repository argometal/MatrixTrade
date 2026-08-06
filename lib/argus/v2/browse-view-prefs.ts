/** Persist browse layout + status chip filter (per browser, per portfolio). */

export type BrowseLayoutView = "grid" | "list" | "board";

export type BrowseViewPrefs = {
  view?: BrowseLayoutView;
  /** Chip / status filter value (e.g. Archived, Quiet, Completed, all). */
  status?: string;
};

const STORAGE_KEY = "argus-v2-browse-view-prefs-v1";

function readAll(): Record<string, BrowseViewPrefs> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, BrowseViewPrefs>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function readBrowseViewPrefs(scope: string): BrowseViewPrefs {
  const all = readAll();
  const prefs = all[scope];
  if (!prefs || typeof prefs !== "object") return {};
  const view =
    prefs.view === "grid" || prefs.view === "list" || prefs.view === "board" ? prefs.view : undefined;
  const status = typeof prefs.status === "string" && prefs.status ? prefs.status : undefined;
  return { view, status };
}

export function writeBrowseViewPrefs(scope: string, patch: BrowseViewPrefs): void {
  if (typeof window === "undefined") return;
  try {
    const all = readAll();
    const prev = all[scope] ?? {};
    all[scope] = {
      ...prev,
      ...(patch.view ? { view: patch.view } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* quota */
  }
}

export function isBrowseLayoutView(value: string | null | undefined): value is BrowseLayoutView {
  return value === "grid" || value === "list" || value === "board";
}
