"use client";

import Link from "next/link";
import { ControlPanelButton } from "@/app/components/control-panel/ControlPanelButton";
import { AppExchangeActions } from "@/app/components/AppExchangeActions";
import { MobileMenuButton } from "@/app/components/preview/MobileMenuButton";
import { useMobileMenu } from "@/app/components/preview/MobileMenuContext";

export function PreviewMobileHeader({ pendingInboxCount = 0 }: { pendingInboxCount?: number }) {
  const { open, toggle } = useMobileMenu();

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-950/95 px-3 py-3 backdrop-blur lg:hidden">
      <Link href="/home-preview" className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
          M
        </span>
        <span className="truncate font-semibold text-zinc-100">MtA</span>
      </Link>

      <div className="flex shrink-0 items-center gap-1.5">
        <ControlPanelButton />
        <AppExchangeActions app="matrix" inboxCount={pendingInboxCount} />
        <MobileMenuButton open={open} onClick={toggle} />
      </div>
    </header>
  );
}
