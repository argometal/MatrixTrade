import type { Runbook, RunbookItem, RunbookProgress, RunbookSubtask } from "./types";

export function normRunbookLine(line: string): string {
  return String(line || "")
    .replace(/^\s*[-*•]\s*/, "")
    .trim();
}

export function runbookStamp(): string {
  return new Date().toISOString().slice(0, 19);
}

export function newRunbookItemId(prefix = "i"): string {
  return `${prefix}${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

export function normalizeRunbookSubtasks(subtasks: RunbookSubtask[] | undefined): RunbookSubtask[] {
  if (!Array.isArray(subtasks)) return [];
  return subtasks
    .map((subtask) => ({
      id: subtask.id || newRunbookItemId("st_"),
      text: String(subtask.text ?? "").trim(),
      done: !!subtask.done,
      doneAt: subtask.doneAt ?? "",
    }))
    .filter((subtask) => subtask.text.length > 0 || subtask.done);
}

export function createRunbookCard(text: string): RunbookItem {
  return {
    id: newRunbookItemId("c_"),
    text: normRunbookLine(text),
    done: false,
    doneAt: "",
    type: "item",
    subtasks: [],
  };
}

export function createRunbookSubtask(text: string): RunbookSubtask {
  return {
    id: newRunbookItemId("st_"),
    text: normRunbookLine(text),
    done: false,
    doneAt: "",
  };
}

/** One line = card; blank line = section separator. */
export function buildRunbookItemsFromText(raw: string): RunbookItem[] {
  const lines = String(raw || "").split("\n");
  const items: RunbookItem[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      items.push({
        id: newRunbookItemId(`s${index}_`),
        text: "",
        done: false,
        doneAt: "",
        type: "sep",
        subtasks: [],
      });
      return;
    }
    const text = normRunbookLine(line);
    if (!text) return;
    items.push({
      id: newRunbookItemId(`i${index}_`),
      text,
      done: false,
      doneAt: "",
      type: "item",
      subtasks: [],
    });
  });

  return items;
}

export function runbookCardProgress(item: RunbookItem): { total: number; done: number; open: number } {
  const subtasks = item.subtasks ?? [];
  const done = subtasks.filter((subtask) => subtask.done).length;
  return { total: subtasks.length, done, open: subtasks.length - done };
}

export function runbookProgress(items: RunbookItem[]): { total: number; done: number; open: number } {
  const actionable = items.filter((item) => item.type !== "sep");
  const done = actionable.filter((item) => item.done).length;
  return { total: actionable.length, done, open: actionable.length - done };
}

export function activeRunbooks(runbooks: Runbook[]): Runbook[] {
  return runbooks
    .filter((runbook) => !runbook.deletedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title));
}

export function runbooksForEntity(runbooks: Runbook[], entityId: string): Runbook[] {
  return activeRunbooks(runbooks).filter((runbook) => runbook.linkedEntityIds.includes(entityId));
}

/**
 * Templates available to assign at Project / Topic / Event.
 * Prefer runbooks already linked to related orgs/projects; fall back to full library.
 */
export function libraryRunbooksForRelated(
  runbooks: Runbook[],
  relatedEntityIds: string[]
): Runbook[] {
  const related = new Set(relatedEntityIds.filter(Boolean));
  const active = activeRunbooks(runbooks);
  if (related.size === 0) return active;
  const fromRelated = active.filter((runbook) =>
    runbook.linkedEntityIds.some((id) => related.has(id))
  );
  return fromRelated.length > 0 ? fromRelated : active;
}

export function progressForEntity(
  records: RunbookProgress[] | undefined,
  entityId: string
): RunbookProgress[] {
  return (records ?? []).filter((row) => row.entityId === entityId);
}

export function runbookHasNestedSubtasks(items: RunbookItem[]): boolean {
  return items.some((item) => item.type === "item" && (item.subtasks?.length ?? 0) > 0);
}

/** Turn each subtask into its own card — flat checklist like HTML. */
export function flattenRunbookSubtasks(items: RunbookItem[]): RunbookItem[] {
  const flat: RunbookItem[] = [];

  for (const item of items) {
    if (item.type === "sep") {
      flat.push({ ...item, subtasks: [] });
      continue;
    }

    flat.push({ ...item, subtasks: [] });

    for (const subtask of item.subtasks ?? []) {
      const text = subtask.text.trim();
      if (!text && !subtask.done) continue;
      flat.push({
        id: newRunbookItemId("f_"),
        text: text || "(subtask)",
        done: subtask.done,
        doneAt: subtask.doneAt ?? "",
        type: "item",
        subtasks: [],
      });
    }
  }

  return flat;
}

export function runbookProgressRecordId(runbookId: string, entityId: string): string {
  return `${runbookId}::${entityId}`;
}

export function findRunbookProgress(
  records: RunbookProgress[] | undefined,
  runbookId: string,
  entityId: string
): RunbookProgress | undefined {
  const id = runbookProgressRecordId(runbookId, entityId);
  return (records ?? []).find((row) => row.id === id);
}

/** Merge template checklist with per-entity progress for execution UI. */
export function applyRunbookProgress(
  runbook: Runbook,
  progress: RunbookProgress | null | undefined
): RunbookItem[] {
  if (!progress) {
    return runbook.items.map((item) => ({
      ...item,
      done: false,
      doneAt: "",
      subtasks: (item.subtasks ?? []).map((subtask) => ({ ...subtask, done: false, doneAt: "" })),
    }));
  }

  return runbook.items.map((item) => {
    const check = progress.checks[item.id];
    return {
      ...item,
      done: check?.done ?? false,
      doneAt: check?.doneAt ?? "",
      subtasks: (item.subtasks ?? []).map((subtask) => {
        const key = `${item.id}:${subtask.id}`;
        const st = progress.checks[key];
        return {
          ...subtask,
          done: st?.done ?? false,
          doneAt: st?.doneAt ?? "",
        };
      }),
    };
  });
}

/** Seed progress from legacy item.done flags (one-time migration aid). */
export function seedProgressFromTemplateItems(
  runbook: Runbook,
  entityId: string
): RunbookProgress {
  const checks: RunbookProgress["checks"] = {};
  for (const item of runbook.items) {
    if (item.type === "sep") continue;
    if (item.done) {
      checks[item.id] = { done: true, doneAt: item.doneAt || runbookStamp() };
    }
    for (const subtask of item.subtasks ?? []) {
      if (subtask.done) {
        checks[`${item.id}:${subtask.id}`] = {
          done: true,
          doneAt: subtask.doneAt || runbookStamp(),
        };
      }
    }
  }
  const actionable = runbook.items.filter((item) => item.type !== "sep");
  const allDone =
    actionable.length > 0 && actionable.every((item) => checks[item.id]?.done);
  return {
    id: runbookProgressRecordId(runbook.id, entityId),
    runbookId: runbook.id,
    entityId,
    checks,
    closed: allDone,
    updatedAt: runbookStamp(),
  };
}

export function scopedRunbookProgress(
  items: RunbookItem[]
): { total: number; done: number; open: number } {
  return runbookProgress(items);
}
