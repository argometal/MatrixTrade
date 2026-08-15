import type { Runbook, RunbookProgress } from "../types";
import { activeRunbooks, applyRunbookProgress, isRunbookCheck } from "../runbook-helpers";

export type V2HomeRunbookLink = {
  id: string;
  title: string;
  href: string;
  /** Short status line — scopes, open checks, or “template”. */
  meta: string;
};

function latestActivityIso(runbook: Runbook, progress: RunbookProgress[]): string {
  let latest = runbook.updatedAt || runbook.createdAt || "";
  for (const row of progress) {
    if (row.runbookId !== runbook.id) continue;
    if (row.updatedAt && row.updatedAt > latest) latest = row.updatedAt;
  }
  return latest;
}

function scopeCount(runbookId: string, progress: RunbookProgress[]): number {
  return progress.filter((row) => row.runbookId === runbookId).length;
}

function openChecksAcrossScopes(runbook: Runbook, progress: RunbookProgress[]): number {
  let open = 0;
  const rows = progress.filter((row) => row.runbookId === runbook.id && !row.closed);
  if (rows.length === 0) {
    // Template open count (no scoped progress yet)
    return runbook.items.filter((item) => isRunbookCheck(item) && !item.done).length;
  }
  for (const row of rows) {
    const items = applyRunbookProgress(runbook, row);
    open += items.filter((item) => isRunbookCheck(item) && !item.done).length;
  }
  return open;
}

function toLink(runbook: Runbook, progress: RunbookProgress[]): V2HomeRunbookLink {
  const scopes = scopeCount(runbook.id, progress);
  const open = openChecksAcrossScopes(runbook, progress);
  const parts: string[] = [];
  if (scopes > 0) parts.push(scopes === 1 ? "1 scope" : `${scopes} scopes`);
  if (open > 0) parts.push(open === 1 ? "1 open" : `${open} open`);
  if (parts.length === 0) parts.push("Template");
  return {
    id: runbook.id,
    title: runbook.title.trim() || "Untitled runbook",
    href: `/argus/v2/runbooks/${runbook.id}`,
    meta: parts.join(" · "),
  };
}

/**
 * Home Intelligence quick access: recently touched + most assigned (frequent) runbooks.
 */
export function buildV2HomeRunbookAccess(
  runbooks: Runbook[],
  progressRecords: RunbookProgress[] | undefined,
  limit = 5
): { recent: V2HomeRunbookLink[]; frequent: V2HomeRunbookLink[] } {
  const progress = (progressRecords ?? []).filter(Boolean);
  const active = activeRunbooks(runbooks);

  const recent = [...active]
    .sort((a, b) => latestActivityIso(b, progress).localeCompare(latestActivityIso(a, progress)))
    .slice(0, limit)
    .map((rb) => toLink(rb, progress));

  const frequent = [...active]
    .map((rb) => ({
      rb,
      scopes: scopeCount(rb.id, progress),
      activity: latestActivityIso(rb, progress),
    }))
    .filter((row) => row.scopes > 0)
    .sort(
      (a, b) =>
        b.scopes - a.scopes || b.activity.localeCompare(a.activity) || a.rb.title.localeCompare(b.rb.title)
    )
    .slice(0, limit)
    .map((row) => toLink(row.rb, progress));

  // If nothing has scoped progress yet, surface the same recent list as frequent fallback.
  if (frequent.length === 0 && recent.length > 0) {
    return { recent, frequent: recent.slice(0, Math.min(3, recent.length)) };
  }

  return { recent, frequent };
}
