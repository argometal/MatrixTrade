"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { V2NavCounts } from "@/lib/argus/v2/loaders";
import { V2Sidebar } from "./V2Sidebar";
import { V2TopBar } from "./V2TopBar";

const STORAGE_KEY = "argus-v2-sidebar-collapsed";

type V2SidebarCollapseContextValue = {
  collapsed: boolean;
  toggle: () => void;
};

const V2SidebarCollapseContext = createContext<V2SidebarCollapseContextValue | null>(null);

export function useV2SidebarCollapse() {
  const value = useContext(V2SidebarCollapseContext);
  if (!value) throw new Error("useV2SidebarCollapse must be used within V2DesktopShell");
  return value;
}

export function V2DesktopShell({
  children,
  counts,
  inboxCount,
  privateConfigured,
  privateUnlocked,
}: {
  children: ReactNode;
  counts: V2NavCounts;
  inboxCount: number;
  privateConfigured: boolean;
  privateUnlocked: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const paddingClass = !ready
    ? "lg:pl-56 xl:pl-60"
    : collapsed
      ? "lg:pl-16"
      : "lg:pl-56 xl:pl-60";

  return (
    <V2SidebarCollapseContext.Provider value={{ collapsed, toggle }}>
      <div className="argus-v2 min-h-screen bg-zinc-950">
        <V2Sidebar counts={counts} collapsed={ready && collapsed} onToggle={toggle} />
        <div
          className={`flex h-dvh min-h-0 flex-col overflow-hidden transition-[padding] duration-200 ease-out ${paddingClass}`}
        >
          <V2TopBar
            inboxCount={inboxCount}
            privateConfigured={privateConfigured}
            privateUnlocked={privateUnlocked}
          />
          <main className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </V2SidebarCollapseContext.Provider>
  );
}
