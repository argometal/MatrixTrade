"use client";

import { Suspense } from "react";
import { HomeExplorer } from "./HomeExplorer";

/**
 * CHANGE 24-1E — Home is the primary knowledge Explorer (not dashboard-first).
 * Overview metrics live collapsed inside HomeExplorer.
 */
export function ForgeHomeDashboard() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading Explorer…</p>}>
      <HomeExplorer />
    </Suspense>
  );
}
