import type { AiNote } from "./ai-notes-types";
import { DEFAULT_AI_BLOCK_REQUEST, SCOUTING_AI_BLOCK_REQUEST } from "./ai-block";
import type { PlaybookStats } from "./analytics";
import type { Playbook } from "./playbook-types";
import { formatMarketEvidenceSection } from "./market-evidence-format";
import type { MarketEvidence } from "./market-evidence-types";
import { buildMatrixMechanicsSnapshot } from "./matrix-mechanics-snapshot";
import {
  buildMatrixMechanicsBrief,
  buildMatrixTrainingContext,
  buildScoutingContextText,
  buildStockFileTrainingContext,
  formatPlaybookTrainingSection,
  type MatrixTrainingContextInput,
} from "./matrix-mechanics-brief";
import { formatPlansSnapshotSection } from "./plan-snapshot";
import { buildStockThesisContextText } from "./stock-thesis-snapshot";
import { buildSmartSnapshot, type SmartSnapshotInput } from "./smart-snapshot";
import {
  buildStockProfileSynthesis,
  formatSynthesisSection,
} from "./stock-profile-synthesis";
import type { StockThesis } from "./stock-thesis-types";
import type { TradePlan } from "./plan-types";
import type { MonthlyRisk } from "./monthly-risk";
import type { Experiment, Trade } from "./types";

export type AiContextScope =
  | "mechanics"
  | "dashboard"
  | "exchange"
  | "playbook"
  | "scouting"
  | "scouting-ticker"
  | "scout-plan"
  | "stock-file"
  | "stock-scouts"
  | "trade"
  | "trade-profile"
  | "trades-list";

export interface AiContextSystemNotes {
  tradesStore: string;
  bridgeConfigured: boolean;
  workerReachable: boolean;
  inboxBackend: string;
  lastSyncAt?: string | null;
}

export interface BuildAiContextInput {
  scope: AiContextScope;
  exchange?: SmartSnapshotInput & { systemNotes?: AiContextSystemNotes };
  playbooks?: Playbook[];
  stockTheses?: StockThesis[];
  plans?: TradePlan[];
  experiment?: Experiment;
  monthly?: MonthlyRisk;
  focusThesis?: StockThesis;
  focusPlan?: TradePlan;
  focusTrade?: Trade;
  activeEvidence?: MarketEvidence[];
  playbookStats?: PlaybookStats[];
  tradeSnapshotText?: string;
}

function appendProfileEvidenceLayers(parts: string[], input: BuildAiContextInput): void {
  const thesis = input.focusThesis ?? input.stockTheses?.[0];
  const evidence = input.activeEvidence;
  if (!thesis || !evidence || evidence.length === 0) return;
  const synthesis = buildStockProfileSynthesis(thesis, evidence);
  parts.push("", formatSynthesisSection(synthesis), "", formatMarketEvidenceSection(evidence));
}

function formatSystemNotesSection(notes: AiContextSystemNotes): string {
  const lines = [
    "=== SYSTEM ===",
    `trades_store:${notes.tradesStore}`,
    `bridge:${notes.bridgeConfigured ? "configured" : "missing"}`,
    `worker:${notes.workerReachable ? "reachable" : "offline"}`,
    `inbox:${notes.inboxBackend}`,
  ];
  if (notes.lastSyncAt) lines.push(`last_sync:${notes.lastSyncAt}`);
  return lines.join("\n");
}

function requestBlockForScope(scope: AiContextScope): string {
  if (
    scope === "mechanics" ||
    scope === "dashboard" ||
    scope === "exchange" ||
    scope === "trade" ||
    scope === "trades-list" ||
    scope === "playbook"
  ) {
    return DEFAULT_AI_BLOCK_REQUEST.trim();
  }
  return SCOUTING_AI_BLOCK_REQUEST.trim();
}

function ensureMechanicsBrief(body: string, scope: AiContextScope): string {
  if (scope === "mechanics") return body;
  if (body.includes("=== MATRIX MECHANICS")) return body;
  return [buildMatrixMechanicsBrief(), "", body].join("\n");
}

function buildDashboardBody(input: BuildAiContextInput): string {
  return buildExchangeBody(input);
}

function buildExchangeBody(input: BuildAiContextInput): string {
  const ex = input.exchange!;
  const base = buildSmartSnapshot({
    ...ex,
    options: ex.options ?? { setups: ex.setups },
  });
  const parts = [base];
  if (ex.systemNotes) {
    parts.push("", formatSystemNotesSection(ex.systemNotes));
  }
  return parts.join("\n");
}

function buildScoutingBody(input: BuildAiContextInput): string {
  const training: MatrixTrainingContextInput = {
    playbooks: input.playbooks,
    stockTheses: input.stockTheses,
    plans: input.plans,
    experiment: input.experiment,
    monthly: input.monthly,
  };
  return buildMatrixTrainingContext(training);
}

function buildScoutingTickerBody(input: BuildAiContextInput): string {
  if (!input.focusThesis) {
    return buildScoutingBody(input);
  }
  const parts = [
    buildScoutingContextText({
      thesis: input.focusThesis,
      plans: input.plans ?? [],
      playbooks: input.playbooks,
      monthly: input.monthly,
    }),
  ];
  appendProfileEvidenceLayers(parts, input);
  return parts.join("\n");
}

function buildStockFileBody(input: BuildAiContextInput): string {
  const thesis = input.focusThesis ?? input.stockTheses?.[0];
  if (!thesis) return "(no stock profile)";
  const parts = [
    buildStockFileTrainingContext({
      thesis,
      playbooks: input.playbooks,
    }),
  ];
  appendProfileEvidenceLayers(parts, input);
  return parts.join("\n");
}

function buildStockScoutsBody(input: BuildAiContextInput): string {
  const thesis = input.focusThesis;
  if (!thesis) return "(no stock profile)";
  const tickerPlans = (input.plans ?? []).filter((p) => p.stockThesisId === thesis.id);
  return [
    `=== LINKED SCOUTS · ${thesis.ticker} ===`,
    formatPlansSnapshotSection(tickerPlans),
  ].join("\n");
}

function buildScoutPlanBody(input: BuildAiContextInput): string {
  const plan = input.focusPlan;
  if (!plan) return "(no scout plan)";
  const lines = [
    `=== SCOUT PLAN · ${plan.ticker} ===`,
    formatPlansSnapshotSection([plan]),
  ];
  if (input.focusThesis) {
    lines.push("", buildStockThesisContextText(input.focusThesis));
  }
  return lines.join("\n");
}

function buildPlaybookBody(input: BuildAiContextInput): string {
  const lines = ["=== PLAYBOOK LAB ==="];
  if (input.playbooks?.length) {
    lines.push(formatPlaybookTrainingSection(input.playbooks));
  }
  if (input.playbookStats?.length) {
    lines.push("", "=== PLAYBOOK STATS ===");
    for (const row of input.playbookStats) {
      const name = row.playbook?.name ?? "Unassigned";
      lines.push(
        `- ${name}: trades=${row.tradeCount} win=${row.winRate !== null ? `${(row.winRate * 100).toFixed(0)}%` : "—"} net=${row.netPnL.toFixed(2)} mistakes=${row.mistakesCount}`
      );
    }
  }
  return lines.join("\n");
}

function buildTradeBody(input: BuildAiContextInput): string {
  if (!input.tradeSnapshotText) return "(no trade)";
  return ["=== TRADE ===", input.tradeSnapshotText].join("\n");
}

function buildTradeProfileBody(input: BuildAiContextInput): string {
  const thesis = input.focusThesis;
  if (!thesis) return "(no linked stock profile)";
  return buildStockThesisContextText(thesis);
}

function buildTradesListBody(input: BuildAiContextInput): string {
  const ex = input.exchange;
  if (!ex) return "(no trades)";
  return buildSmartSnapshot({
    experiment: ex.experiment,
    monthly: ex.monthly,
    trades: ex.trades,
    options: { setups: ex.setups },
  });
}

function buildMechanicsBody(): string {
  return buildMatrixMechanicsSnapshot();
}

export function buildAiContext(input: BuildAiContextInput): string {
  let body: string;
  switch (input.scope) {
    case "mechanics":
      body = buildMechanicsBody();
      break;
    case "dashboard":
    case "exchange":
      body = buildDashboardBody(input);
      break;
    case "playbook":
      body = buildPlaybookBody(input);
      break;
    case "scouting":
      body = buildScoutingBody(input);
      break;
    case "scouting-ticker":
      body = buildScoutingTickerBody(input);
      break;
    case "scout-plan":
      body = buildScoutPlanBody(input);
      break;
    case "stock-file":
      body = buildStockFileBody(input);
      break;
    case "stock-scouts":
      body = buildStockScoutsBody(input);
      break;
    case "trade":
      body = buildTradeBody(input);
      break;
    case "trade-profile":
      body = buildTradeProfileBody(input);
      break;
    case "trades-list":
      body = buildTradesListBody(input);
      break;
    default:
      body = buildMatrixMechanicsBrief();
  }
  return ensureMechanicsBrief(body, input.scope);
}

/** Context + REQUEST block for paste into external AI. */
export function buildAiContextPackage(input: BuildAiContextInput): string {
  const body = buildAiContext(input);
  const request = requestBlockForScope(input.scope);
  if (input.scope === "mechanics") {
    return body;
  }
  return [body, "", "=== REQUEST ===", request].join("\n");
}

/** @deprecated Use buildAiContextPackage({ scope: 'exchange', exchange: input }) */
export function buildLegacyExchangeSnapshot(
  input: SmartSnapshotInput & { systemNotes: AiContextSystemNotes; priorAiNotes?: AiNote[] }
): string {
  return buildAiContextPackage({
    scope: "exchange",
    exchange: input,
  });
}
