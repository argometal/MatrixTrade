"use client";

import { AppExchangeActions } from "@/app/components/AppExchangeActions";
import { MxtBrandMark } from "@/app/components/MxtBrandMark";

/** Login and other Matrix routes outside the trading shell. */
export function MatrixPublicTopBar() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur">
      <MxtBrandMark size="sm" tone="light" />
      <AppExchangeActions app="matrix" />
    </header>
  );
}
