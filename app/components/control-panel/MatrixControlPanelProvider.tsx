"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { ControlPanelData } from "@/lib/control-panel-types";
import { MatrixControlPanel } from "./MatrixControlPanel";

type MatrixControlPanelContextValue = {
  open: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  data: ControlPanelData;
};

const MatrixControlPanelContext = createContext<MatrixControlPanelContextValue | null>(null);

export function useControlPanel() {
  const value = useContext(MatrixControlPanelContext);
  if (!value) {
    throw new Error("useControlPanel must be used within MatrixControlPanelProvider");
  }
  return value;
}

export function MatrixControlPanelProvider({
  data,
  children,
}: {
  data: ControlPanelData;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const openPanel = useCallback(() => setOpen(true), []);
  const closePanel = useCallback(() => setOpen(false), []);
  const togglePanel = useCallback(() => setOpen((value) => !value), []);

  return (
    <MatrixControlPanelContext.Provider
      value={{ open, openPanel, closePanel, togglePanel, data }}
    >
      {children}
      <MatrixControlPanel />
    </MatrixControlPanelContext.Provider>
  );
}
