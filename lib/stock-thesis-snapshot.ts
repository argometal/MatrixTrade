import {
  formatStockThesisZone,
  isActiveStockThesisStatus,
  STOCK_THESIS_STATUS_LABELS,
  type StockThesis,
} from "./stock-thesis-types";

export function formatStockThesesSnapshotSection(theses: StockThesis[]): string {
  const active = theses.filter((t) => isActiveStockThesisStatus(t.status));
  const lines = ["=== STOCK FILES (AI) ==="];

  if (active.length === 0) {
    lines.push("active_theses:0");
    return lines.join("\n");
  }

  lines.push(`active_theses:${active.length}`);
  for (const thesis of active) {
    const levels = thesis.levels;
    lines.push(
      [
        `- id:${thesis.id}`,
        `ticker:${thesis.ticker}`,
        `status:${thesis.status}`,
        `style:${thesis.style}`,
        `support:${levels.majorSupport ?? "na"}`,
        `resistance:${levels.majorResistance ?? "na"}`,
        `primary_zone:${formatStockThesisZone(levels.primaryZone)}`,
        `min_rr:${thesis.riskRules.minimumRR}`,
        `invalidation:${thesis.riskRules.invalidation.replace(/\s+/g, " ").slice(0, 120)}`,
      ].join(" ")
    );
    lines.push(`  thesis:${thesis.thesis.replace(/\s+/g, " ").slice(0, 200)}`);
    lines.push(`  hypothesis:${thesis.currentHypothesis.replace(/\s+/g, " ").slice(0, 200)}`);
  }

  return lines.join("\n");
}

export function buildStockThesisContextText(thesis: StockThesis): string {
  const levels = thesis.levels;
  const lines = [
    `=== STOCK FILE: ${thesis.id} ===`,
    `ticker:${thesis.ticker}`,
    `status:${STOCK_THESIS_STATUS_LABELS[thesis.status]}`,
    `style:${thesis.style}`,
    `version:${thesis.version}`,
    "",
    "thesis:",
    thesis.thesis,
    "",
    "current_hypothesis:",
    thesis.currentHypothesis,
    "",
    "=== HISTORICAL ANALYSIS ===",
  ];

  if (thesis.historicalAnalysis.length === 0) {
    lines.push("(none)");
  } else {
    for (const row of thesis.historicalAnalysis) {
      lines.push(`- ${row.timeframe}: ${row.summary}`);
    }
  }

  lines.push(
    "",
    "=== LEVELS ===",
    `major_support:${levels.majorSupport ?? "na"}`,
    `major_resistance:${levels.majorResistance ?? "na"}`,
    `primary_zone:${formatStockThesisZone(levels.primaryZone)}`,
    `secondary_zone:${formatStockThesisZone(levels.secondaryZone)}`,
    `targets:${levels.targets?.join(", ") ?? "na"}`,
    "",
    "=== RISK RULES ===",
    `minimum_rr:${thesis.riskRules.minimumRR}`,
    `thesis_invalidation:${thesis.riskRules.invalidation}`,
    "rr_stop_rule:planned R:R uses scout plan strategy_stop only — never substitute structural zones or invalidation as stop unless explicitly set on PLAN"
  );

  if (thesis.riskRules.setupInvalidation) {
    lines.push(`setup_invalidation:${thesis.riskRules.setupInvalidation}`);
  }

  if (thesis.riskRules.notes) {
    lines.push(`notes:${thesis.riskRules.notes}`);
  }
  if (thesis.notes) {
    lines.push("", "notes:", thesis.notes);
  }

  lines.push("", `updated:${thesis.updatedAt}`);
  return lines.join("\n");
}
