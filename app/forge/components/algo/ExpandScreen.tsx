"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type ExpandScreenValue = {
  expanded: boolean;
  toggle: () => void;
  collapse: () => void;
};

const ExpandScreenContext = createContext<ExpandScreenValue | null>(null);

export function useExpandScreen() {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  return {
    expanded,
    toggle: () => setExpanded((v) => !v),
    collapse: () => setExpanded(false),
  };
}

export function ExpandScreenProvider({ children }: { children: ReactNode }) {
  const value = useExpandScreen();
  return <ExpandScreenContext.Provider value={value}>{children}</ExpandScreenContext.Provider>;
}

export function useExpandScreenControls(): ExpandScreenValue {
  const ctx = useContext(ExpandScreenContext);
  if (!ctx) {
    throw new Error("useExpandScreenControls must be used within ExpandScreenProvider");
  }
  return ctx;
}

/** Pins children to the viewport. Escape or ExpandScreenButton exits. */
export function ExpandScreenFrame({
  expanded,
  children,
}: {
  expanded: boolean;
  children: ReactNode;
}) {
  if (!expanded) return <>{children}</>;
  return (
    <div className="fixed inset-0 z-[100] flex min-h-0 min-w-0 flex-col overflow-auto bg-[#f4f6f8] p-4">
      {children}
    </div>
  );
}

export function ExpandScreenButton({
  expanded,
  onToggle,
  className,
}: {
  expanded?: boolean;
  onToggle?: () => void;
  className?: string;
}) {
  const ctx = useContext(ExpandScreenContext);
  const isExpanded = expanded ?? ctx?.expanded ?? false;
  const toggle = onToggle ?? ctx?.toggle;
  if (!toggle) return null;
  return (
    <button
      type="button"
      aria-pressed={isExpanded}
      aria-label={isExpanded ? "Exit full screen" : "Expand to screen"}
      className={
        className ??
        "min-h-10 shrink-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-[#2f80ed]"
      }
      onClick={toggle}
    >
      {isExpanded ? "Exit" : "Expand"}
    </button>
  );
}
