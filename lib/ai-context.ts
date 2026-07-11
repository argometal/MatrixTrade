import type { AiNote } from "./ai-notes-types";
import { DEFAULT_AI_BLOCK_REQUEST, SCOUTING_AI_BLOCK_REQUEST } from "./ai-block";
import { formatMarketEvidenceSection } from "./market-evidence-format";
import type { MarketEvidence } from "./market-evidence-types";
import type { Playbook } from "./playbook-types";
import {
  buildMatrixMechanicsBrief,
  buildMatrixTrainingContext,
  buildScoutingContextText,
  buildStockFileTrainingContext,
  type MatrixTrainingContextInput,
} from "./matrix-mechanics-brief";
import { buildSmartSnapshot, type SmartSnapshotInput } from "./smart-snapshot";
import {
  buildStockProfileSynthesis,
  formatSynthesisSection,
} from "./stock-profile-synthesis";
import type { StockThesis } from "./stock-thesis-types";
import type { TradePlan } from "./plan-types";
import type { MonthlyRisk } from "./monthly-risk";
import type { Experiment, Trade } from "./types";

export type AiContextScope = "exchange" | "scouting" | "scouting-ticker" | "stock-file";

export interface AiContextSystemNotes {
  tradesStore: string;
  bridgeConfigured: boolean;
  workerReachable: boolean;
  inboxBackend: string;
  lastSyncAt?: string | null;
}

export interface BuildAiContextInput {
  scope: AiContextScope;
  /** Full assistant snapshot — trades, experiment, monthly, etc. */
  exchange?: SmartSnapshotInput & { systemNotes?: AiContextSystemNotes };
  /** Scouting / file scopes */
  playbooks?: Playbook[];
  stockTheses?: StockThesis[];
  plans?: TradePlan[];
  experiment?: Experiment;
  monthly?: MonthlyRisk;
  /** scouting-ticker scope */
  focusThesis?: StockThesis;
  /** Active evidence rows for stock-file / scouting-ticker scopes */
  activeEvidence?: MarketEvidence[];
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
  if (scope === "exchange") return DEFAULT_AI_BLOCK_REQUEST.trim();
  return SCOUTING_AI_BLOCK_REQUEST.trim();
}

function buildExchangeBody(input: BuildAiContextInput): string {
  const ex = input.exchange!;
  const base = buildSmartSnapshot({
    ...ex,
    options: ex.options ?? { setups: ex.setups },
  });
  const parts = [buildMatrixMechanicsBrief(), "", base];
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
  if (!thesis) return buildMatrixMechanicsBrief();
  const parts = [
    buildStockFileTrainingContext({
      thesis,
      playbooks: input.playbooks,
    }),
  ];
  appendProfileEvidenceLayers(parts, input);
  return parts.join("\n");
}

/** Single AI context builder — same engineering for Exchange and Scouting. */
export function buildAiContext(input: BuildAiContextInput): string {
  switch (input.scope) {
    case "exchange":
      return buildExchangeBody(input);
    case "scouting":
      return buildScoutingBody(input);
    case "scouting-ticker":
      return buildScoutingTickerBody(input);
    case "stock-file":
      return buildStockFileBody(input);
    default:
      return buildMatrixMechanicsBrief();
  }
}

/** Context + REQUEST block for paste into ChatGPT. */
export function buildAiContextPackage(input: BuildAiContextInput): string {
  const body = buildAiContext(input);
  const request = requestBlockForScope(input.scope);
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
