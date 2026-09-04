import type { Playbook } from "./playbook-types";
import type { SnapshotMenuItem } from "./snapshot-types";
import type { StockThesis } from "./stock-thesis-types";

export type ControlPanelThesisEntry = {
  thesis: StockThesis;
  snapshotItems: SnapshotMenuItem[];
};

/**
 * Control section ids (content drawers — not the 4 primary home buttons).
 * Primary home: start-here | stock-file | library | apply (apply is a step).
 * Library drawers: train-ai (Mechanics), mtae, playbook, scouting, learning (MAF).
 * Forensic closed-trade export lives on `/trades/[id]`, never here.
 */
export type ControlPanelSectionId =
  | "start-here"
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
  /** Control → Start Here — compact router (not full Mechanics). */
  startHere: {
    brief: string;
  };
  /** Library → Mechanics — full constitution + (legacy) snapshot items. */
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
