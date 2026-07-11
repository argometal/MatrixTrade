import { formatPlansSnapshotSection } from "./plan-snapshot";
import { formatDecisionSection } from "./scout-decision";
import { formatProbeSection } from "./scout-probe";
import type { Playbook } from "./playbook-types";
import { PLAYBOOK_STATUS_LABELS } from "./playbook-types";
import {
  computeScoutingVerdictFromThesis,
  SCOUTING_VERDICT_LABELS,
  type ScoutingVerdict,
} from "./scouting-types";
import { buildStockThesisContextText } from "./stock-thesis-snapshot";
import type { StockThesis } from "./stock-thesis-types";
import type { TradePlan } from "./plan-types";
import type { MonthlyRisk } from "./monthly-risk";
import type { Experiment } from "./types";

export interface MatrixTrainingContextInput {
  playbooks?: Playbook[];
  stockTheses?: StockThesis[];
  plans?: TradePlan[];
  experiment?: Experiment;
  monthly?: MonthlyRisk;
}

/** Stable primer — read by AI before any case-specific payload. */
export function buildMatrixMechanicsBrief(): string {
  return [
    "=== MATRIX MECHANICS ===",
    "",
    "IDENTITY",
    "MatrixTrade is NOT a conventional trading journal.",
    "It is a strategic planning pipeline: proven method → per-ticker profile → go/no-go decision with quantified risk → execution and review.",
    "Trade recording is the floor of the building, not the mission.",
    "",
    "FOUR LAYERS (strict order — never reverse)",
    "1. Playbook (HOW) — reusable, tested operating method: rules, checklist, forbidden errors. Not per-ticker analysis.",
    "2. Stock File (WHO / Expediente del objetivo) — strategic memory per ticker: levels, zones, targets, invalidation, minimum R:R, current hypothesis.",
    "3. Scouting Desk (Sala de decisión) — gatekeeper: go / wait / no; quantified risk before any trade; links Playbook + Stock File.",
    "4. Trade (execution) — what was executed: entry, stop, exit, P/L, review.",
    "",
    "RULE OF GOLD",
    "Playbook → Stock File → Scouting Desk → Trade.",
    "Never suggest reversing this order (e.g. do not invent a trade before a Stock File exists, or override invalidation to force entry).",
    "",
    "WHAT AI MAY DO",
    "- Reason within the layer order using only supplied data.",
    "- Compare planned R:R vs Stock File minimum R:R.",
    "- Flag invalidation breaches, monthly risk room, and thesis status conflicts.",
    "- Propose edits to hypothesis, levels, or scout plans — as suggestions, not silent changes.",
    "- Ask clarifying questions when data is missing.",
    "",
    "WHAT AI MAY NOT DO",
    "- Invent trades, fills, or P/L not in the payload.",
    "- Override Stock File invalidation or minimum R:R without explicit user approval.",
    "- Change Playbook, Stock File, or scout records silently — ask before changing files.",
    "- Treat Matrix as a generic journal or signal service.",
    "- Invent prices for confirmationCost or R:R — use only user-supplied numbers.",
    "",
    "ASYMMETRY RULE",
    "Matrix does not maximize confirmation. It maximizes expected value under predefined risk.",
    "Confirmation has a cost: higher entry, reduced reward, wider structural risk, lower R:R.",
    "A setup may become more probable while becoming less profitable.",
    "Scouting Desk must evaluate BOTH:",
    "1. thesis quality — how likely is the hypothesis correct?",
    "2. opportunity quality — how attractive is the trade at the current price?",
    "Distinguish location evidence (reached strategic zone) from confirmation evidence (control shift).",
    "When price reaches a predefined zone and thesis remains valid, a controlled probe may be considered",
    "if current R:R meets Stock File minimum, waiting would materially reduce R:R, stop is defined,",
    "and loss is acceptable. Do not force confirmation when it destroys required asymmetry.",
    "Do not tighten stops artificially to manufacture R:R.",
    "Distinguish setup invalidation (this entry failed) from thesis invalidation (Stock File case dead).",
    "",
    "EXPERIMENT SCOPE",
    "Playbook experiment — hypothesis tested across many qualified trades; one stock does not prove/disprove it.",
    "Stock experiment — one ticker is one data point under the playbook; update playbook only after N trades.",
    "",
    "POST-STOP OBSERVATION RULE",
    "A stopped/losing trade does not automatically invalidate the Stock File thesis.",
    "After a loss: close normally, preserve the plan, observe 90 calendar days unless thesis invalidates earlier.",
    "Record whether original targets or invalidation were reached; classify loss after study — not at stop time.",
    "Do not reopen or modify a trade automatically. New entry: Stock File → Scouting Desk → Trade again.",
    "",
    "EXPORT ORDER (when user pastes context)",
    "1. MATRIX MECHANICS (this block)",
    "2. PLAYBOOK — active method if any",
    "3. STOCK FILE — target profile for the ticker",
    "4. SCOUTING STATE — go/wait/no + quantified risk + active scouts",
    "5. USER QUESTION — only after the above",
  ].join("\n");
}

export function formatPlaybookTrainingSection(playbooks: Playbook[]): string {
  const lines = ["=== PLAYBOOK ==="];
  if (playbooks.length === 0) {
    lines.push("(none loaded)");
    return lines.join("\n");
  }

  const active = playbooks.filter((p) => p.status === "ACTIVE");
  const testing = playbooks.filter((p) => p.status === "TESTING");
  const hint = active.length > 0 ? active : testing;
  if (hint.length > 0) {
    lines.push(`active_hint:${hint.map((p) => p.id).join(",")}`);
  }

  for (const pb of playbooks) {
    lines.push(
      `- id:${pb.id} name:${pb.name} status:${PLAYBOOK_STATUS_LABELS[pb.status]}`
    );
    if (pb.description.trim()) {
      lines.push(`  description:${pb.description.replace(/\s+/g, " ").slice(0, 200)}`);
    }
    if (pb.checklist.length > 0) {
      lines.push(`  checklist:${pb.checklist.slice(0, 8).join(" | ")}`);
    }
    if (pb.principles?.length) {
      lines.push(`  principles:${pb.principles.slice(0, 6).join(" | ")}`);
    }
    if (pb.experimentHypothesis) {
      lines.push(
        `  experiment:${pb.experimentHypothesis.replace(/\s+/g, " ").slice(0, 200)}`
      );
    }
  }
  return lines.join("\n");
}

function formatMonthlyRiskSection(monthly: MonthlyRisk): string {
  return [
    "=== MONTHLY RISK ===",
    `month:${monthly.monthKey}`,
    `monthly_loss_room:${monthly.monthlyLossRoom.toFixed(2)}`,
    `monthly_room_cap:${monthly.monthlyRoomCap.toFixed(2)}`,
    `monthly_pnl:${monthly.monthlyRealizedPnL.toFixed(2)}`,
    `cap_breached:${monthly.monthlyCapBreached ? "yes" : "no"}`,
  ].join("\n");
}

function formatScoutingStateSection(
  theses: StockThesis[],
  plans: TradePlan[],
  monthly?: MonthlyRisk
): string {
  const lines = ["=== SCOUTING STATE ==="];

  if (monthly) {
    lines.push(
      `monthly_loss_room:${monthly.monthlyLossRoom.toFixed(2)}`,
      `monthly_cap_breached:${monthly.monthlyCapBreached ? "yes" : "no"}`
    );
    lines.push("");
  }

  if (theses.length === 0) {
    lines.push("stock_files:0");
  } else {
    lines.push(`stock_files:${theses.length}`);
    for (const thesis of theses) {
      const verdict = computeScoutingVerdictFromThesis(thesis);
      lines.push(
        `- ticker:${thesis.ticker} id:${thesis.id} status:${thesis.status} verdict:${verdict} (${SCOUTING_VERDICT_LABELS[verdict]}) min_rr:${thesis.riskRules.minimumRR}`
      );
      lines.push(
        `  invalidation:${thesis.riskRules.invalidation.replace(/\s+/g, " ").slice(0, 120)}`
      );
    }
  }

  const tickerPlans = plans.filter((p) => p.status === "watching" || p.status === "ready");
  lines.push("");
  if (tickerPlans.length === 0) {
    lines.push("active_scouts:0");
  } else {
    lines.push(`active_scouts:${tickerPlans.length}`);
    lines.push(formatPlansSnapshotSection(tickerPlans).replace("=== TRADE PLANS (AI) ===", "").trim());
  }

  return lines.join("\n");
}

/** Mechanics first, then optional live slices for AI training. */
export function buildMatrixTrainingContext(input: MatrixTrainingContextInput = {}): string {
  const sections = [buildMatrixMechanicsBrief()];

  if (input.playbooks && input.playbooks.length > 0) {
    sections.push("", formatPlaybookTrainingSection(input.playbooks));
  }

  if (input.stockTheses && input.stockTheses.length > 0) {
    for (const thesis of input.stockTheses) {
      sections.push("", buildStockThesisContextText(thesis));
    }
  }

  if (
    (input.plans && input.plans.length > 0) ||
    (input.stockTheses && input.stockTheses.length > 0) ||
    input.monthly
  ) {
    sections.push(
      "",
      formatScoutingStateSection(
        input.stockTheses ?? [],
        input.plans ?? [],
        input.monthly
      )
    );
  }

  if (input.experiment) {
    sections.push(
      "",
      "=== EXPERIMENT (context) ===",
      `closed_trades:${input.experiment.closedTrades}`,
      `net_pnl:${input.experiment.realizedPnL.toFixed(2)}`
    );
  }

  if (input.monthly && !input.plans?.length && !input.stockTheses?.length) {
    sections.push("", formatMonthlyRiskSection(input.monthly));
  }

  return sections.join("\n");
}

/** Ticker-scoped context for Scouting Desk copy button. */
export function buildScoutingContextText(input: {
  thesis: StockThesis;
  plans: TradePlan[];
  playbooks?: Playbook[];
  monthly?: MonthlyRisk;
}): string {
  const tickerPlans = input.plans.filter((p) => p.stockThesisId === input.thesis.id);
  return buildMatrixTrainingContext({
    playbooks: input.playbooks,
    stockTheses: [input.thesis],
    plans: tickerPlans,
    monthly: input.monthly,
  });
}

/** Stock File detail page — mechanics + file + playbook hint. */
export function buildStockFileTrainingContext(input: {
  thesis: StockThesis;
  playbooks?: Playbook[];
}): string {
  return buildMatrixTrainingContext({
    playbooks: input.playbooks,
    stockTheses: [input.thesis],
  });
}

export function scoutingVerdictStyle(verdict: ScoutingVerdict): string {
  switch (verdict) {
    case "go":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "wait":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "probe":
      return "bg-violet-500/15 text-violet-300 border-violet-500/30";
    case "no":
      return "bg-red-500/15 text-red-400 border-red-500/30";
  }
}
