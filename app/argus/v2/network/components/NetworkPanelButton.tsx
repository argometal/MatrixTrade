"use client";

import { useNetworkPanel } from "./NetworkPanelProvider";

/** Network desk / contact entry — same placement pattern as Matrix Control. */
export function NetworkPanelButton({
  className = "",
}: {
  className?: string;
}) {
  const { openPanel } = useNetworkPanel();

  return (
    <button
      type="button"
      onClick={openPanel}
      className={`inline-flex h-9 shrink-0 items-center rounded-xl bg-violet-600 px-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 active:scale-[0.98] ${className}`}
      title="Network — copy AI context or apply contact update"
    >
      Network
    </button>
  );
}
