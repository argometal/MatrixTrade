"use client";

import { CAPTURE } from "@/lib/argus/ux-copy";

export function CaptureFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={CAPTURE.fab}
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-teal-500 text-2xl font-light text-white shadow-lg shadow-teal-950/50 transition hover:bg-teal-400 active:scale-95"
    >
      +
    </button>
  );
}
