"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  readOperationalView,
  readSelectedSystem,
  readVaultMode,
  writeOperationalView,
  writeSelectedSystem,
  writeVaultMode,
  type ForgeSystemId,
  type OperationalViewId,
  type VaultModeId,
} from "@/lib/argusforge/af03-system-state";

type ForgeSystemContextValue = {
  /** Which engine logic is active (Argus vs MTA). */
  system: ForgeSystemId;
  setSystem: (system: ForgeSystemId) => void;
  /** Last chosen operational view (Focus / Active / Archive). */
  view: OperationalViewId;
  setView: (view: OperationalViewId) => void;
  vaultMode: VaultModeId;
  setVaultMode: (mode: VaultModeId) => void;
  ready: boolean;
};

const ForgeSystemContext = createContext<ForgeSystemContextValue | null>(null);

export function ForgeSystemProvider({ children }: { children: ReactNode }) {
  const [system, setSystemState] = useState<ForgeSystemId>("argusforge");
  const [view, setViewState] = useState<OperationalViewId>("active");
  const [vaultMode, setVaultModeState] = useState<VaultModeId>("vault");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSystemState(readSelectedSystem());
    setViewState(readOperationalView());
    setVaultModeState(readVaultMode());
    setReady(true);
  }, []);

  const setSystem = useCallback((next: ForgeSystemId) => {
    setSystemState(next);
    writeSelectedSystem(next);
  }, []);

  const setView = useCallback((next: OperationalViewId) => {
    setViewState(next);
    writeOperationalView(next);
  }, []);

  const setVaultMode = useCallback((next: VaultModeId) => {
    setVaultModeState(next);
    writeVaultMode(next);
  }, []);

  const value = useMemo(
    () => ({ system, setSystem, view, setView, vaultMode, setVaultMode, ready }),
    [system, setSystem, view, setView, vaultMode, setVaultMode, ready]
  );

  return <ForgeSystemContext.Provider value={value}>{children}</ForgeSystemContext.Provider>;
}

export function useForgeSystem(): ForgeSystemContextValue {
  const ctx = useContext(ForgeSystemContext);
  if (!ctx) {
    throw new Error("useForgeSystem must be used within ForgeSystemProvider");
  }
  return ctx;
}
