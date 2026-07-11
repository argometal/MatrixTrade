import { buildAiContextPackage } from "./ai-context";
import type { Playbook } from "./playbook-types";
import type { StockThesis } from "./stock-thesis-types";
import type { SnapshotMenuItem } from "./snapshot-types";
import { mechanicsSnapshotItem } from "./snapshot-packages";
import { wrapSnapshotText } from "./snapshot-verification";
import type { Setup } from "./setup-types";
import { formatTradeForSnapshot } from "./trade-snapshot-format";
import type { Trade } from "./types";

export function tradeSnapshotItems(input: {
  trade: Trade;
  setups: Setup[];
  playbooks: Playbook[];
  linkedThesis?: StockThesis;
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
  items.push(mechanicsSnapshotItem());
  return items;
}
