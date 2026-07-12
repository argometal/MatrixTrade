"use client";

import { useControlPanel } from "./MatrixControlPanelProvider";

export function ControlPanelButton({
  compact = false,
  className = "",
  onClick,
}: {
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const { openPanel } = useControlPanel();

  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        openPanel();
      }}
      className={`w-full rounded-lg border border-violet-500/50 bg-violet-600/20 px-3 py-2.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-600/30 ${className}`}
    >
      {compact ? "Control" : "Control panel"}
    </button>
  );
}
