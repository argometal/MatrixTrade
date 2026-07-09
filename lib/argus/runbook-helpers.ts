import type { Runbook, RunbookItem } from "./types";

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

/** One line = item; blank line = section separator. */
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
    });
  });

  return items;
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
