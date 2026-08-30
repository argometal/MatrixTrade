"use client";

import Link from "next/link";
import { ControlPanelButton } from "@/app/components/control-panel/ControlPanelButton";
import { AppExchangeActions } from "@/app/components/AppExchangeActions";
import { MxtBrandLockup } from "@/app/components/MxtBrandMark";
import { MobileMenuButton } from "@/app/components/preview/MobileMenuButton";
import { useMobileMenu } from "@/app/components/preview/MobileMenuContext";

export function PreviewMobileHeader({ pendingInboxCount = 0 }: { pendingInboxCount?: number }) {
  const { open, toggle } = useMobileMenu();

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-950/95 px-3 py-3 backdrop-blur lg:hidden">
      <Link href="/mta/home-preview" className="min-w-0">
        <MxtBrandLockup />
      </Link>

      <div className="flex shrink-0 items-center gap-1.5">
        <ControlPanelButton />
        <AppExchangeActions app="matrix" inboxCount={pendingInboxCount} />
        <MobileMenuButton open={open} onClick={toggle} />
      </div>
    </header>
  );
}
