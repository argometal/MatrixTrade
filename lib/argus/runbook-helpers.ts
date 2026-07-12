import type { Runbook, RunbookItem, RunbookSubtask } from "./types";

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

export function runbooksForEntity(runbooks: Runbook[], entityId: string): Runbook[] {
  return runbooks
    .filter((runbook) => !runbook.deletedAt && runbook.linkedEntityIds.includes(entityId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title));
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
