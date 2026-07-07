"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type MobileMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);

export function MobileMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <MobileMenuContext.Provider
      value={{
        open,
        setOpen,
        toggle: () => setOpen((o) => !o),
      }}
    >
      {children}
    </MobileMenuContext.Provider>
  );
}

export function useMobileMenu() {
  const ctx = useContext(MobileMenuContext);
  if (!ctx) {
    throw new Error("useMobileMenu must be used within MobileMenuProvider");
  }
  return ctx;
}
