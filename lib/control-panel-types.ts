import type { Playbook } from "./playbook-types";
import type { SnapshotMenuItem } from "./snapshot-types";
import type { StockThesis } from "./stock-thesis-types";

export type ControlPanelThesisEntry = {
  thesis: StockThesis;
  snapshotItems: SnapshotMenuItem[];
};

/**
 * Control section ids.
 * Primary: train-ai (Matrix Mechanics), stock-file (direct access).
 * Library: mtae, playbook, scouting, learning.
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
  /** Existing MAF protocol only — no invented Learning mega-package. */
  learning: {
    mafProtocolBrief: string;
    snapshotItems: SnapshotMenuItem[];
  };
};
