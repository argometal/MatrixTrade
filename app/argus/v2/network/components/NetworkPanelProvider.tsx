"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { SnapshotMenuItem } from "@/lib/snapshot-types";
import { NetworkPanel } from "./NetworkPanel";

type NetworkPanelContextValue = {
  open: boolean;
  openPanel: () => void;
  closePanel: () => void;
  snapshotItems: SnapshotMenuItem[];
  defaultEntityId?: string;
  panelTitle: string;
};

const NetworkPanelContext = createContext<NetworkPanelContextValue | null>(null);

export function useNetworkPanel() {
  const value = useContext(NetworkPanelContext);
  if (!value) {
    throw new Error("useNetworkPanel must be used within NetworkPanelProvider");
  }
  return value;
}

export function NetworkPanelProvider({
  snapshotItems,
  defaultEntityId,
  panelTitle = "Network",
  children,
}: {
  snapshotItems: SnapshotMenuItem[];
  defaultEntityId?: string;
  panelTitle?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const openPanel = useCallback(() => setOpen(true), []);
  const closePanel = useCallback(() => setOpen(false), []);

  return (
    <NetworkPanelContext.Provider
      value={{ open, openPanel, closePanel, snapshotItems, defaultEntityId, panelTitle }}
    >
      {children}
      <NetworkPanel />
    </NetworkPanelContext.Provider>
  );
}
