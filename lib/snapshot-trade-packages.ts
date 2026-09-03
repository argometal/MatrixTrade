import { buildAiContextPackage } from "./ai-context";
import {
  formatHistoricalAttributionEvidenceBrief,
  historicalAttributionEvidenceLabel,
} from "./historical-attribution-evidence";
import { isHistoricalTradeCandidate } from "./historical-case-attribution";
import type { ObservationRecord } from "./observation-types";
import type { Playbook } from "./playbook-types";
import type { StockThesis } from "./stock-thesis-types";
import type { SnapshotMenuItem } from "./snapshot-types";
import { mechanicsSnapshotItem } from "./snapshot-packages";
import { wrapSnapshotText } from "./snapshot-verification";
import type { Setup } from "./setup-types";
import { formatTradeForSnapshot } from "./trade-snapshot-format";
import { formatTradeForensicSnapshot } from "./trade-forensic-snapshot";
import type { Trade } from "./types";
import type { TradePlan } from "./plan-types";

export function tradeSnapshotItems(input: {
  trade: Trade;
  setups: Setup[];
  playbooks: Playbook[];
  linkedThesis?: StockThesis;
  plans?: TradePlan[];
  theses?: StockThesis[];
  observation?: ObservationRecord | null;
}): SnapshotMenuItem[] {
  const tradeText = formatTradeForSnapshot(input.trade, input.setups, input.playbooks);
  const items: SnapshotMenuItem[] = [
    {
      id: "trade",
      label: `${input.trade.ticker} · ${input.trade.id} trade`,
      description: "Entry, stop, target, status, P/L, review state",
      text: wrapSnapshotText(
        `${input.trade.ticker} · ${input.trade.id} trade snapshot`,
        buildAiContextPackage({
          scope: "trade",
          tradeSnapshotText: tradeText,
        })
      ),
    },
  ];
  if (input.linkedThesis) {
    items.push({
      id: "trade-profile",
      label: `${input.trade.ticker} · profile (compact)`,
      description: "Linked stock dossier summary",
      text: wrapSnapshotText(
        `${input.trade.ticker} profile snapshot`,
        buildAiContextPackage({
          scope: "trade-profile",
          focusThesis: input.linkedThesis,
          playbooks: input.playbooks,
        })
      ),
    });
  }
  if (input.trade.status === "closed") {
    items.push(
      tradeForensicSnapshotItem({
        trade: input.trade,
        playbooks: input.playbooks,
        plans: input.plans,
        theses: input.theses,
      })
    );
  }
  if (isHistoricalTradeCandidate(input.trade)) {
    items.push(
      historicalAttributionEvidenceSnapshotItem({
        trade: input.trade,
        observation: input.observation,
      })
    );
  }
  // Mechanics remains available via Control → MTA Mechanics; keep row for standalone trade window portability.
  items.push(mechanicsSnapshotItem());
  return items;
}

/** Historical / planless closed trade — evidence for AI attribution proposal (not MAF Accept). */
export function historicalAttributionEvidenceSnapshotItem(input: {
  trade: Trade;
  observation?: ObservationRecord | null;
  reconstructionNote?: string | null;
}): SnapshotMenuItem {
  const label = historicalAttributionEvidenceLabel(input.trade);
  const noteFromTrade =
    input.reconstructionNote?.trim() ||
    input.trade.notes?.trim() ||
    input.trade.thesis?.trim() ||
    null;
  const body = formatHistoricalAttributionEvidenceBrief({
    trade: input.trade,
    observation: input.observation,
    reconstructionNote: noteFromTrade,
  });
  return {
    id: "historical-attribution-evidence",
    label,
    description:
      "Historical evidence for MAF attribution proposal — not accepted MAF; Plan/T0 may be absent",
    text: wrapSnapshotText(label, body),
  };
}

/**
 * Closed-trade evidence only — no embedded Mechanics brief, no universal REQUEST.
 * Human states the task in chat; AI asks for this block by visible label when needed.
 */
export function tradeForensicSnapshotItem(input: {
  trade: Trade;
  playbooks: Playbook[];
  plans?: TradePlan[];
  theses?: StockThesis[];
}): SnapshotMenuItem {
  const linkedPlan =
    input.plans?.find((p) => p.id === input.trade.planId) ??
    input.plans?.find((p) => p.ticker === input.trade.ticker && p.linkedTradeId === input.trade.id);
  const linkedThesis =
    input.theses?.find((t) => t.id === linkedPlan?.stockThesisId) ??
    input.theses?.find((t) => t.ticker === input.trade.ticker);

  const forensicBody = formatTradeForensicSnapshot({
    trade: input.trade,
    playbooks: input.playbooks,
    linkedPlan,
    linkedThesis,
  });

  return {
    id: "trade-forensic",
    label: `${input.trade.ticker} · ${input.trade.id} forensic`,
    description: "Closed trade evidence — legacy gaps, R, review, post-stop (no Mechanics / Request)",
    text: wrapSnapshotText(`${input.trade.ticker} · ${input.trade.id} forensic`, forensicBody),
  };
}
