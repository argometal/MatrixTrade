"use client";

import Link from "next/link";
import { MobileMenuButton } from "@/app/components/preview/MobileMenuButton";
import { useMobileMenu } from "@/app/components/preview/MobileMenuContext";

export function PreviewMobileHeader() {
  const { open, toggle } = useMobileMenu();

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur lg:hidden">
      <Link href="/home-preview" className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
          M
        </span>
        <span className="font-semibold text-zinc-100">MatrixTrade</span>
      </Link>
      <MobileMenuButton open={open} onClick={toggle} />
    </header>
  );
}
