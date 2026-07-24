import { normRunbookLine, parseRunbookSectionTitle } from "./runbook-helpers";
import type { RunbookItemType } from "./types";

export type RunbookBulkPreviewLine = {
  text: string;
  type: RunbookItemType;
};

/** Parse pasted AI/list text into preview lines (1 line = check, `#` = section, blank = sep). */
export function parseRunbookBulkText(raw: string): RunbookBulkPreviewLine[] {
  const lines = String(raw || "").split("\n");
  const result: RunbookBulkPreviewLine[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      result.push({ text: "", type: "sep" });
      return;
    }
    const sectionTitle = parseRunbookSectionTitle(trimmed);
    if (sectionTitle) {
      result.push({ text: sectionTitle, type: "section" });
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
  return lines
    .map((line) => {
      if (line.type === "sep") return "";
      if (line.type === "section") return `# ${line.text}`;
      return line.text;
    })
    .join("\n");
}
