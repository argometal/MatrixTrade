import type { Playbook } from "./playbook-types";
import type { SnapshotMenuItem } from "./snapshot-types";
import type { StockThesis } from "./stock-thesis-types";

export type ControlPanelThesisEntry = {
  thesis: StockThesis;
  snapshotItems: SnapshotMenuItem[];
};

/**
 * Control copy layers — descriptive labels only.
 * Forensic closed-trade export lives on `/trades/[id]`, never here.
 * MTAE (Technical analysis) is its own section — not Mechanics, not Playbook.
 */
export type ControlPanelSectionId =
  | "train-ai"
  | "mtae"
  | "playbook"
  | "stock-file"
  | "scouting";

export type ControlPanelData = {
  playbooks: Playbook[];
  activeThesisCount: number;
  activePlanCount: number;
  pendingInboxCount: number;
  trainAi: {
    mechanicsBrief: string;
    snapshotItems: SnapshotMenuItem[];
  };
  mtae: {
    protocolBrief: string;
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
};
