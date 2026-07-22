"use client";

import { useControlPanel } from "./MatrixControlPanelProvider";

/** Top-bar entry — same placement pattern as Argus Create. */
export function ControlPanelButton({
  className = "",
}: {
  className?: string;
}) {
  const { openPanel } = useControlPanel();

  return (
    <button
      type="button"
      onClick={() => openPanel()}
      className={`inline-flex h-9 shrink-0 items-center rounded-xl bg-violet-600 px-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 active:scale-[0.98] ${className}`}
      title="Control — Apply AI Blocks or copy MtA context"
    >
      Control
    </button>
  );
}
