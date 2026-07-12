import type { ConnectFlowOpenOptions } from "./matrix-connect-types";
import type { Playbook } from "./playbook-types";
import type { TradePlan } from "./plan-types";
import type { SnapshotMenuItem } from "./snapshot-types";
import type { StockThesis } from "./stock-thesis-types";

export type ControlPanelThesisEntry = {
  thesis: StockThesis;
  snapshotItems: SnapshotMenuItem[];
};

export type ControlPanelPlanEntry = {
  plan: TradePlan;
  snapshotItems: SnapshotMenuItem[];
};

export type ControlPanelData = {
  playbooks: Playbook[];
  activeTheses: StockThesis[];
  activePlans: TradePlan[];
  pendingInboxCount: number;
  trainAi: {
    mechanicsBrief: string;
    mechanicsSnapshot: SnapshotMenuItem;
    playbookSnapshotItems: SnapshotMenuItem[];
    connectOptions: ConnectFlowOpenOptions;
  };
  playbook: {
    snapshotItems: SnapshotMenuItem[];
    connectOptions: ConnectFlowOpenOptions;
  };
  stockFile: {
    theses: ControlPanelThesisEntry[];
    connectOptions: ConnectFlowOpenOptions;
  };
  scouting: {
    overviewSnapshotItems: SnapshotMenuItem[];
    planEntries: ControlPanelPlanEntry[];
    thesisEntries: ControlPanelThesisEntry[];
    connectOptions: ConnectFlowOpenOptions;
  };
  trade: {
    snapshotItems: SnapshotMenuItem[];
    connectOptions: ConnectFlowOpenOptions;
  };
};
