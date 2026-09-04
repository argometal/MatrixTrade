"use client";

import { AppExchangeActions } from "@/app/components/AppExchangeActions";
import { ControlPanelButton } from "@/app/components/control-panel/ControlPanelButton";
import { StartHereButton } from "@/app/components/control-panel/StartHereButton";

export function MatrixDesktopChrome({ pendingInboxCount = 0 }: { pendingInboxCount?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <StartHereButton />
      <ControlPanelButton />
      <AppExchangeActions app="matrix" inboxCount={pendingInboxCount} />
    </div>
  );
}
