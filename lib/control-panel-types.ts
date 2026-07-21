import type { Playbook } from "./playbook-types";
import type { SnapshotMenuItem } from "./snapshot-types";
import type { StockThesis } from "./stock-thesis-types";
import type { Trade } from "./types";

export type ControlPanelThesisEntry = {
  thesis: StockThesis;
  snapshotItems: SnapshotMenuItem[];
};

export type ControlPanelTradeEntry = {
  trade: Trade;
  snapshotItems: SnapshotMenuItem[];
};

export type ControlPanelSectionId =
  | "train-ai"
  | "stock-file"
  | "scouting"
  | "trade";

export type ControlPanelData = {
  playbooks: Playbook[];
  activeThesisCount: number;
  activePlanCount: number;
  pendingInboxCount: number;
  trainAi: {
    mechanicsBrief: string;
    snapshotItems: SnapshotMenuItem[];
  };
  playbook: {
    snapshotItems: SnapshotMenuItem[];
  };
  stockFile: {
    theses: ControlPanelThesisEntry[];
  };
  scouting: {
    snapshotItems: SnapshotMenuItem[];
  };
  trade: {
    snapshotItems: SnapshotMenuItem[];
    closedTrades: ControlPanelTradeEntry[];
  };
};
