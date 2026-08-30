"use client";

import type { ReactNode } from "react";
import { useForgeSystem } from "./ForgeSystemProvider";
import { MtaScopedPanel } from "./MtaScopedPanel";

/** Renders AF children or MTA scoped panel based on selectedSystem. */
export function SystemScopedSection({
  section,
  children,
}: {
  section: "home" | "library" | "active" | "archive";
  children: ReactNode;
}) {
  const { system, ready } = useForgeSystem();

  if (!ready) {
    return <p className="text-sm text-zinc-500">Loading system…</p>;
  }

  if (system === "mta") {
    return <MtaScopedPanel section={section} />;
  }

  return <>{children}</>;
}
