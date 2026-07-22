"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { SnapshotMenuItem } from "@/lib/snapshot-types";
import type { NetworkPanelPackage } from "@/lib/argus/network-ai-mechanics";
import { NetworkPanel } from "./NetworkPanel";

type NetworkPanelContextValue = {
  open: boolean;
  openPanel: () => void;
  closePanel: () => void;
  mechanics: SnapshotMenuItem | null;
  libraryItems: SnapshotMenuItem[];
  libraryGroups: Array<{ category: string; items: SnapshotMenuItem[] }>;
  /** @deprecated Prefer mechanics + libraryItems */
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
  panelPackage,
  snapshotItems,
  defaultEntityId,
  panelTitle = "Network",
  children,
}: {
  /** Preferred: Mechanics + Apply + Library. */
  panelPackage?: NetworkPanelPackage;
  /** Legacy flat list — used only when panelPackage is omitted. */
  snapshotItems?: SnapshotMenuItem[];
  defaultEntityId?: string;
  panelTitle?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const openPanel = useCallback(() => setOpen(true), []);
  const closePanel = useCallback(() => setOpen(false), []);

  const mechanics = panelPackage?.mechanics ?? null;
  const libraryItems = panelPackage?.library ?? snapshotItems ?? [];
  const libraryGroups =
    panelPackage?.libraryGroups ??
    (libraryItems.length > 0 ? [{ category: "Library", items: libraryItems }] : []);
  const flatFallback = snapshotItems ?? [...(mechanics ? [mechanics] : []), ...libraryItems];

  return (
    <NetworkPanelContext.Provider
      value={{
        open,
        openPanel,
        closePanel,
        mechanics,
        libraryItems,
        libraryGroups,
        snapshotItems: flatFallback,
        defaultEntityId: panelPackage?.defaultEntityId ?? defaultEntityId,
        panelTitle: panelPackage?.panelTitle ?? panelTitle,
      }}
    >
      {children}
      <NetworkPanel />
    </NetworkPanelContext.Provider>
  );
}
