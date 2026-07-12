"use client";

import { MatrixAppChromeActions } from "@/app/components/AppChromeActions";

/** Top chrome for Matrix routes outside the trading shell (e.g. login). */
export function MatrixPublicChrome() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-end gap-2 border-b border-zinc-200 bg-white/95 px-3 py-3 backdrop-blur">
      <MatrixAppChromeActions />
    </header>
  );
}
