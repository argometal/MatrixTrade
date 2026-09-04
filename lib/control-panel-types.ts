import type { Playbook } from "./playbook-types";
import type { SnapshotMenuItem } from "./snapshot-types";
import type { StockThesis } from "./stock-thesis-types";

export type ControlPanelThesisEntry = {
  thesis: StockThesis;
  snapshotItems: SnapshotMenuItem[];
};

/**
 * Control section ids.
 * Primary: train-ai (MTA Mechanics), stock-file (direct access).
 * Library: mtae, playbook, scouting, learning (UI label MAF).
 * Apply is a step, not a section id.
 * Forensic closed-trade export lives on `/trades/[id]`, never here.
 */
export type ControlPanelSectionId =
  | "train-ai"
  | "mtae"
  | "playbook"
  | "stock-file"
  | "scouting"
  | "learning";

export type ControlPanelData = {
  playbooks: Playbook[];
  activeThesisCount: number;
  activePlanCount: number;
  pendingInboxCount: number;
  trainAi: {
    mechanicsBrief: string;
    schemaContractBrief: string;
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
    /** Archived Stock Files — inspect only; default picker hides these. */
    archivedTheses: ControlPanelThesisEntry[];
  };
  scouting: {
    snapshotItems: SnapshotMenuItem[];
  };
  /** MAF Library drawer — protocol lives in Mechanics; no redundant copy row. */
  learning: {
    snapshotItems: SnapshotMenuItem[];
  };
};
