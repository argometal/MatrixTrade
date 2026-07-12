import { normRunbookLine } from "./runbook-helpers";
import type { RunbookItemType } from "./types";

export type RunbookBulkPreviewLine = {
  text: string;
  type: RunbookItemType;
};

/** Parse pasted AI/list text into preview lines (1 line = card, blank = separator). */
export function parseRunbookBulkText(raw: string): RunbookBulkPreviewLine[] {
  const lines = String(raw || "").split("\n");
  const result: RunbookBulkPreviewLine[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      result.push({ text: "", type: "sep" });
      return;
    }
    const text = normRunbookLine(line);
    if (text) {
      result.push({ text, type: "item" });
    }
  });

  return result;
}

export function runbookBulkPreviewToText(lines: RunbookBulkPreviewLine[]): string {
  return lines.map((line) => (line.type === "sep" ? "" : line.text)).join("\n");
}
