"use client";

import type { ReactNode } from "react";

/**
 * ArgusForge-only. MTA is a different engine (MXT) — never scoped into Forge.
 */
export function SystemScopedSection({
  children,
}: {
  section: "home" | "library" | "active" | "archive";
  children: ReactNode;
}) {
  return <>{children}</>;
}
