"use client";

import { SystemScopedSection } from "./components/SystemScopedSection";
import { ForgeHomeDashboard } from "./components/ForgeHomeDashboard";

/**
 * AF03 Home — overview when ArgusForge is selected; MTA overview when MTA is selected.
 */
export default function ForgeHomePage() {
  return (
    <SystemScopedSection section="home">
      <ForgeHomeDashboard />
    </SystemScopedSection>
  );
}
