"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { ConnectFlowOpenOptions } from "@/lib/matrix-connect-types";
import { MatrixConnectWindow } from "@/app/components/matrix-connect/MatrixConnectWindow";

type ConnectFlowState = ConnectFlowOpenOptions;

type MatrixConnectContextValue = {
  openConnect: (options: ConnectFlowOpenOptions) => void;
};

const MatrixConnectContext = createContext<MatrixConnectContextValue | null>(null);

export function useMatrixConnect() {
  const value = useContext(MatrixConnectContext);
  if (!value) {
    throw new Error("useMatrixConnect must be used within MatrixConnectProvider");
  }
  return value;
}

export function MatrixConnectProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ConnectFlowState | null>(null);

  const openConnect = useCallback((options: ConnectFlowOpenOptions) => {
    setState(options);
    setOpen(true);
  }, []);

  const closeConnect = useCallback(() => {
    setOpen(false);
    setState(null);
  }, []);

  return (
    <MatrixConnectContext.Provider value={{ openConnect }}>
      {children}
      {state ? (
        <MatrixConnectWindow open={open} options={state} onClose={closeConnect} />
      ) : null}
    </MatrixConnectContext.Provider>
  );
}
