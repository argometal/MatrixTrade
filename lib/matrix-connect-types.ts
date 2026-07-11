import type { SnapshotMenuItem } from "@/lib/snapshot-types";

export type ConnectWindow =
  | "dashboard"
  | "planning"
  | "stock-thesis"
  | "trade"
  | "playbook"
  | "system"
  | "trades-hub";

export type ConnectIntent =
  | "validate-scout"
  | "update-file"
  | "open-trade"
  | "adjust-trade"
  | "close-trade"
  | "add-evidence"
  | "general";

export type ConnectFlowOpenOptions = {
  window?: ConnectWindow;
  intent?: ConnectIntent;
  ticker?: string;
  tradeId?: string;
  planId?: string;
  stockProfileId?: string;
  snapshotTitle: string;
  snapshotDescription: string;
  snapshotItems: SnapshotMenuItem[];
};

export const CONNECT_INTENT_OPTIONS: {
  id: ConnectIntent;
  label: string;
  hint: string;
}[] = [
  {
    id: "validate-scout",
    label: "Validate scout / decision",
    hint: "Verdict, confidence, challenges on a PLAN",
  },
  {
    id: "update-file",
    label: "Update stock file",
    hint: "Thesis, levels, status on a Stock Profile",
  },
  {
    id: "open-trade",
    label: "Open trade",
    hint: "New execution with entry, stop, shares",
  },
  {
    id: "adjust-trade",
    label: "Adjust trade",
    hint: "Stop, target, thesis on an open trade",
  },
  {
    id: "close-trade",
    label: "Close trade",
    hint: "Exit price and post-close review",
  },
  {
    id: "add-evidence",
    label: "Add evidence",
    hint: "Market observation row on a profile",
  },
  {
    id: "general",
    label: "Other / paste block",
    hint: "Paste any AI Block your assistant returned",
  },
];
