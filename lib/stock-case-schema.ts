/** Allowed keys for stock-case-create — schema-first; reject invented fields. */

export const STOCK_CASE_CREATE_ALLOWED_KEYS = [
  "ticker",
  "style",
  "status",
  "thesis",
  "currentHypothesis",
  "levels",
  "riskRules",
  "historicalAnalysis",
  "notes",
  "initialScout",
] as const;

export const STOCK_CASE_LEVELS_ALLOWED_KEYS = [
  "majorSupport",
  "majorResistance",
  "primaryZone",
  "secondaryZone",
  "targets",
] as const;

export const STOCK_CASE_RISK_ALLOWED_KEYS = [
  "minimumRR",
  "invalidation",
  "notes",
] as const;

export const STOCK_CASE_SCOUT_ALLOWED_KEYS = [
  "plannedEntry",
  "stopPrice",
  "targetPrice",
  "supportLevel",
  "validFrom",
  "validUntil",
  "thesis",
  "notes",
  "verdict",
  "decisionConfidence",
  "challenges",
  "minimumRR",
  "status",
  "reasoning",
  "playbookId",
  "playbookIds",
] as const;

export function listUnknownStockCaseCreateKeys(
  proposal: Record<string, unknown>
): string[] {
  return Object.keys(proposal).filter(
    (k) => !(STOCK_CASE_CREATE_ALLOWED_KEYS as readonly string[]).includes(k)
  );
}
