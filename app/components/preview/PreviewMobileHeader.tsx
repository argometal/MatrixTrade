"use client";

import Link from "next/link";
import { MobileMenuButton } from "@/app/components/preview/MobileMenuButton";
import { useMobileMenu } from "@/app/components/preview/MobileMenuContext";

export function PreviewMobileHeader() {
  const { open, toggle } = useMobileMenu();

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-950/95 px-3 py-3 backdrop-blur lg:hidden">
      <Link href="/home-preview" className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
          M
        </span>
        <span className="truncate font-semibold text-zinc-100">MatrixTrade</span>
      </Link>

      <div className="flex shrink-0 items-center gap-1.5">
        <MobileMenuButton open={open} onClick={toggle} />
      </div>
    </header>
  );
}
