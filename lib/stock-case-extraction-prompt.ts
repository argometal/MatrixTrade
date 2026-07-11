import { buildStockCaseBootPackage } from "./stock-case-boot";

/** @deprecated Use buildStockCaseBootPackage — optional notes appended for manual helper only */
export function buildStockCaseExtractionPrompt(notes?: string): string {
  const base = buildStockCaseBootPackage();
  if (!notes?.trim()) return base;
  return `${base}\n\n--- OPTIONAL NOTES ---\n${notes.trim()}`;
}
