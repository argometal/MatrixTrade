"use client";

import { AppExchangeActions } from "@/app/components/AppExchangeActions";
import { ControlPanelButton } from "@/app/components/control-panel/ControlPanelButton";

export function MatrixDesktopChrome({ pendingInboxCount = 0 }: { pendingInboxCount?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <ControlPanelButton />
      <AppExchangeActions app="matrix" inboxCount={pendingInboxCount} />
    </div>
  );
}
