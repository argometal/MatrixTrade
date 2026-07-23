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
  readSelectedSystem,
  readVaultMode,
  writeSelectedSystem,
  writeVaultMode,
  type ForgeSystemId,
  type VaultModeId,
} from "@/lib/argusforge/af03-system-state";

type ForgeSystemContextValue = {
  system: ForgeSystemId;
  setSystem: (system: ForgeSystemId) => void;
  vaultMode: VaultModeId;
  setVaultMode: (mode: VaultModeId) => void;
  ready: boolean;
};

const ForgeSystemContext = createContext<ForgeSystemContextValue | null>(null);

export function ForgeSystemProvider({ children }: { children: ReactNode }) {
  const [system, setSystemState] = useState<ForgeSystemId>("argusforge");
  const [vaultMode, setVaultModeState] = useState<VaultModeId>("vault");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSystemState(readSelectedSystem());
    setVaultModeState(readVaultMode());
    setReady(true);
  }, []);

  const setSystem = useCallback((next: ForgeSystemId) => {
    setSystemState(next);
    writeSelectedSystem(next);
  }, []);

  const setVaultMode = useCallback((next: VaultModeId) => {
    setVaultModeState(next);
    writeVaultMode(next);
  }, []);

  const value = useMemo(
    () => ({ system, setSystem, vaultMode, setVaultMode, ready }),
    [system, setSystem, vaultMode, setVaultMode, ready]
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
