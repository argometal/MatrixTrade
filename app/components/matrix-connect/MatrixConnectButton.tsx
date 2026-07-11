"use client";

import { useMatrixConnect } from "@/app/components/matrix-connect/MatrixConnectProvider";
import type { ConnectFlowOpenOptions } from "@/lib/matrix-connect-types";

export function MatrixConnectButton({
  contextLabel,
  connectOptions,
  className = "",
}: {
  contextLabel?: string;
  connectOptions: ConnectFlowOpenOptions;
  className?: string;
}) {
  const { openConnect } = useMatrixConnect();
  const label = contextLabel ? `Connect · ${contextLabel}` : "Connect";

  return (
    <button
      type="button"
      onClick={() => openConnect(connectOptions)}
      className={`rounded-lg border border-violet-500/40 bg-violet-600/15 px-4 py-2 text-sm font-semibold text-violet-200 hover:bg-violet-600/25 ${className}`}
    >
      {label}
    </button>
  );
}
