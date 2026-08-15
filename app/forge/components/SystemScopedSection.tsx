"use client";

import type { ReactNode } from "react";
import { useForgeSystem } from "./ForgeSystemProvider";

/**
 * Always renders ArgusForge children.
 * Trading deep-link “MTA” shell mode is disabled (name collision with AF-MTA).
 */
export function SystemScopedSection({
  section: _section,
  children,
}: {
  section: "home" | "library" | "active" | "archive";
  children: ReactNode;
}) {
  const { ready } = useForgeSystem();

  if (!ready) {
    return <p className="text-sm text-zinc-500">Loading system…</p>;
  }

  return <>{children}</>;
}
