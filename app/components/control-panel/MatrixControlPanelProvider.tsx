"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { ControlPanelData } from "@/lib/control-panel-types";
import { MatrixControlPanel } from "./MatrixControlPanel";

/** Steps that can be requested when opening Control from another surface. */
export type ControlPanelOpenStep = "pick" | "apply";

export type OpenControlPanelOptions = {
  step?: ControlPanelOpenStep;
};

type MatrixControlPanelContextValue = {
  open: boolean;
  /** Step to land on when the drawer opens (defaults to pick). */
  requestedStep: ControlPanelOpenStep;
  openPanel: (options?: OpenControlPanelOptions) => void;
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
  const [requestedStep, setRequestedStep] = useState<ControlPanelOpenStep>("pick");

  const openPanel = useCallback((options?: OpenControlPanelOptions) => {
    setRequestedStep(options?.step === "apply" ? "apply" : "pick");
    setOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
    setRequestedStep("pick");
  }, []);

  const togglePanel = useCallback(() => {
    setOpen((value) => {
      if (value) {
        setRequestedStep("pick");
        return false;
      }
      setRequestedStep("pick");
      return true;
    });
  }, []);

  return (
    <MatrixControlPanelContext.Provider
      value={{ open, requestedStep, openPanel, closePanel, togglePanel, data }}
    >
      {children}
      <MatrixControlPanel />
    </MatrixControlPanelContext.Provider>
  );
}
