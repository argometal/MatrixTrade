import type { Runbook, RunbookItem, RunbookProgress, RunbookSubtask } from "./types";
import { normalizeTagList, tagKey } from "./tag-ontology";

export function normRunbookLine(line: string): string {
  return String(line || "")
    .replace(/^\s*[-*•]\s*/, "")
    .trim();
}

/** `# Section` / `## Section` → section title; otherwise null. */
export function parseRunbookSectionTitle(line: string): string | null {
  const match = String(line || "")
    .trim()
    .match(/^#{1,6}\s+(.+)$/);
  if (!match) return null;
  const title = normRunbookLine(match[1]);
  return title || null;
}

export function runbookStamp(): string {
  return new Date().toISOString().slice(0, 19);
}

export function newRunbookItemId(prefix = "i"): string {
  return `${prefix}${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

export function isRunbookCheck(item: RunbookItem): boolean {
  return item.type === "item";
}

export function isRunbookSection(item: RunbookItem): boolean {
  return item.type === "section";
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

export function createRunbookSection(text: string): RunbookItem {
  return {
    id: newRunbookItemId("sec_"),
    text: normRunbookLine(text),
    done: false,
    doneAt: "",
    type: "section",
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

/**
 * One line = check; blank line = separator; `# Title` = section header.
 */
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
    const sectionTitle = parseRunbookSectionTitle(trimmed);
    if (sectionTitle) {
      items.push({
        id: newRunbookItemId(`sec${index}_`),
        text: sectionTitle,
        done: false,
        doneAt: "",
        type: "section",
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

/** Serialize items back to bulk text (`#` for sections, blank for seps). */
export function runbookItemsToText(items: RunbookItem[]): string {
  return items
    .map((item) => {
      if (item.type === "sep") return "";
      if (item.type === "section") return `# ${item.text}`;
      return item.text;
    })
    .join("\n");
}

export function runbookCardProgress(item: RunbookItem): { total: number; done: number; open: number } {
  const subtasks = item.subtasks ?? [];
  const done = subtasks.filter((subtask) => subtask.done).length;
  return { total: subtasks.length, done, open: subtasks.length - done };
}

export function runbookProgress(items: RunbookItem[]): { total: number; done: number; open: number } {
  const actionable = items.filter(isRunbookCheck);
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

export function runbookClassificationTags(runbook: Pick<Runbook, "tags">): string[] {
  return normalizeTagList(runbook.tags);
}

/** Pattern tags ∪ entity binder tags — keys used to suggest unassigned runbooks. */
export function scopeRunbookSuggestionKeys(tags: string[] | undefined): Set<string> {
  return new Set(normalizeTagList(tags).map(tagKey));
}

/**
 * Runbook classification tags that overlap the suggestion scope (display form from the runbook).
 * Empty when scope is empty or there is no real overlap — never invent matches.
 */
export function matchingRunbookSuggestionTags(
  runbook: Pick<Runbook, "tags">,
  keys: Set<string>
): string[] {
  if (keys.size === 0) return [];
  return runbookClassificationTags(runbook).filter((tag) => keys.has(tagKey(tag)));
}

export function runbookMatchesSuggestionKeys(
  runbook: Pick<Runbook, "tags">,
  keys: Set<string>
): boolean {
  return matchingRunbookSuggestionTags(runbook, keys).length > 0;
}

/**
 * Quantity = overlap size; quality = extra weight when matches hit priority (Pattern) tags.
 * Score 0 means no real match — callers must hide those rows from Suggested.
 */
export function scoreRunbookSuggestionMatch(
  matchingTags: string[],
  priorityKeys: Set<string> = new Set()
): number {
  if (matchingTags.length === 0) return 0;
  const priorityHits = matchingTags.filter((tag) => priorityKeys.has(tagKey(tag))).length;
  return matchingTags.length * 100 + priorityHits;
}

export type RankedRunbookSuggestion<T extends Pick<Runbook, "tags">> = {
  runbook: T;
  matchingTags: string[];
  score: number;
};

/**
 * Rank library runbooks by meaningful tag overlap. Omits non-matches.
 * `priorityTags` (usually Pattern tags) boost quality without inventing work.
 */
export function rankRunbookSuggestions<T extends Pick<Runbook, "tags" | "title" | "updatedAt">>(
  runbooks: T[],
  suggestionTags: string[] | undefined,
  priorityTags: string[] | undefined = []
): RankedRunbookSuggestion<T>[] {
  const keys = scopeRunbookSuggestionKeys(suggestionTags);
  if (keys.size === 0) return [];
  const priorityKeys = scopeRunbookSuggestionKeys(priorityTags);

  const ranked: RankedRunbookSuggestion<T>[] = [];
  for (const runbook of runbooks) {
    const matchingTags = matchingRunbookSuggestionTags(runbook, keys);
    const score = scoreRunbookSuggestionMatch(matchingTags, priorityKeys);
    if (score <= 0) continue;
    ranked.push({ runbook, matchingTags, score });
  }

  return ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const updated = b.runbook.updatedAt.localeCompare(a.runbook.updatedAt);
    if (updated !== 0) return updated;
    return a.runbook.title.localeCompare(b.runbook.title);
  });
}

/** Tags that actually caused at least one suggestion match — safe to prefill on create. */
export function suggestionTagsForCreate(
  ranked: Array<Pick<RankedRunbookSuggestion<Pick<Runbook, "tags">>, "matchingTags">>
): string[] {
  return normalizeTagList(ranked.flatMap((row) => row.matchingTags));
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
    if (item.type !== "item") {
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

/** Fresh per-entity progress — never copy template `item.done` into project/topic scopes. */
export function emptyRunbookProgress(runbookId: string, entityId: string): RunbookProgress {
  return {
    id: runbookProgressRecordId(runbookId, entityId),
    runbookId,
    entityId,
    checks: {},
    closed: false,
    updatedAt: runbookStamp(),
  };
}

/**
 * Seed progress from legacy item.done flags (one-time migration aid only).
 * Do not use for normal Project/Topic/Event execute toggles — that copied org-template
 * checkmarks onto child projects and made checks look broken / instantly “all done”.
 */
export function seedProgressFromTemplateItems(
  runbook: Runbook,
  entityId: string
): RunbookProgress {
  const checks: RunbookProgress["checks"] = {};
  for (const item of runbook.items) {
    if (!isRunbookCheck(item)) continue;
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
  const actionable = runbook.items.filter(isRunbookCheck);
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

/**
 * [start, end) covering a section header and everything until the next section.
 * Blank seps do not end ownership — Notion-style heading owns following rows.
 */
export function runbookSectionBlockRange(
  items: RunbookItem[],
  sectionId: string
): { start: number; end: number } | null {
  const start = items.findIndex((item) => item.id === sectionId && item.type === "section");
  if (start < 0) return null;
  let end = start + 1;
  while (end < items.length && items[end].type !== "section") {
    end += 1;
  }
  return { start, end };
}

/** Move a section header together with its following checks. */
export function moveRunbookSectionBlock(
  items: RunbookItem[],
  sectionId: string,
  direction: -1 | 1
): RunbookItem[] {
  const range = runbookSectionBlockRange(items, sectionId);
  if (!range) return items;
  const block = items.slice(range.start, range.end);

  if (direction === -1) {
    let prevSectionIdx = -1;
    for (let i = range.start - 1; i >= 0; i -= 1) {
      if (items[i].type === "section") {
        prevSectionIdx = i;
        break;
      }
    }
    if (prevSectionIdx < 0) return items;
    const prevRange = runbookSectionBlockRange(items, items[prevSectionIdx].id);
    if (!prevRange) return items;
    return [
      ...items.slice(0, prevRange.start),
      ...block,
      ...items.slice(prevRange.start, range.start),
      ...items.slice(range.end),
    ];
  }

  let nextSectionIdx = -1;
  for (let i = range.end; i < items.length; i += 1) {
    if (items[i].type === "section") {
      nextSectionIdx = i;
      break;
    }
  }
  if (nextSectionIdx < 0) return items;
  const nextRange = runbookSectionBlockRange(items, items[nextSectionIdx].id);
  if (!nextRange) return items;
  return [
    ...items.slice(0, range.start),
    ...items.slice(range.end, nextRange.end),
    ...block,
    ...items.slice(nextRange.end),
  ];
}

/** Owning section id for a row (nearest preceding section). Seps do not break ownership. */
export function runbookItemSectionId(items: RunbookItem[], itemId: string): string | null {
  const index = items.findIndex((item) => item.id === itemId);
  if (index < 0) return null;
  for (let i = index; i >= 0; i -= 1) {
    if (items[i].type === "section") return items[i].id;
  }
  return null;
}

/** Count checks under a section (for collapsed header badge). */
export function runbookSectionChildStats(
  items: RunbookItem[],
  sectionId: string
): { total: number; open: number; done: number } {
  const range = runbookSectionBlockRange(items, sectionId);
  if (!range) return { total: 0, open: 0, done: 0 };
  const children = items.slice(range.start + 1, range.end).filter(isRunbookCheck);
  const open = children.filter((item) => !item.done).length;
  return { total: children.length, open, done: children.length - open };
}

/** Check item ids owned by a section (until the next section). */
export function runbookSectionCheckIds(items: RunbookItem[], sectionId: string): string[] {
  const range = runbookSectionBlockRange(items, sectionId);
  if (!range) return [];
  return items
    .slice(range.start + 1, range.end)
    .filter(isRunbookCheck)
    .map((item) => item.id);
}

/**
 * Drag-and-drop placement: move a row (or section block) so it starts at targetIndex.
 */
export function placeRunbookBlockAt(
  items: RunbookItem[],
  sourceId: string,
  targetIndex: number
): RunbookItem[] {
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  if (sourceIndex < 0) return items;

  const source = items[sourceIndex];
  let start = sourceIndex;
  let end = sourceIndex + 1;
  if (source.type === "section") {
    const range = runbookSectionBlockRange(items, sourceId);
    if (!range) return items;
    start = range.start;
    end = range.end;
  }

  if (targetIndex >= start && targetIndex < end) return items;

  const block = items.slice(start, end);
  const without = [...items.slice(0, start), ...items.slice(end)];
  let insertAt = targetIndex;
  if (targetIndex > start) insertAt = targetIndex - (end - start);
  insertAt = Math.max(0, Math.min(insertAt, without.length));
  return [...without.slice(0, insertAt), ...block, ...without.slice(insertAt)];
}

/** Ids to copy/move with a row — section includes its owned children. */
export function runbookTransferIds(items: RunbookItem[], itemId: string): string[] {
  const item = items.find((entry) => entry.id === itemId);
  if (!item) return [];
  if (item.type !== "section") return [itemId];
  const range = runbookSectionBlockRange(items, itemId);
  if (!range) return [itemId];
  return items.slice(range.start, range.end).map((entry) => entry.id);
}

export function canMoveRunbookSection(
  items: RunbookItem[],
  sectionId: string,
  direction: -1 | 1
): boolean {
  const range = runbookSectionBlockRange(items, sectionId);
  if (!range) return false;
  if (direction === -1) {
    for (let i = range.start - 1; i >= 0; i -= 1) {
      if (items[i].type === "section") return true;
    }
    return false;
  }
  for (let i = range.end; i < items.length; i += 1) {
    if (items[i].type === "section") return true;
  }
  return false;
}
