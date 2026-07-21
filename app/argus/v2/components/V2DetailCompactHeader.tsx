"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Collapses heavy detail chrome on small screens when a content tab is active. */
export function V2DetailCompactHeader({
  mobileDetail,
  compact,
  title,
  subtitle,
  expanded,
  collapsedExtra,
}: {
  mobileDetail: boolean;
  compact: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  expanded: ReactNode;
  collapsedExtra?: ReactNode;
}) {
  const [expandedManual, setExpandedManual] = useState(false);

  useEffect(() => {
    if (!compact) setExpandedManual(false);
  }, [compact]);

  const showCompact = mobileDetail && compact && !expandedManual;

  if (!showCompact) {
    return (
      <div>
        {mobileDetail && compact && expandedManual ? (
          <button
            type="button"
            onClick={() => setExpandedManual(false)}
            className="mb-2 text-[11px] font-medium text-violet-400 lg:hidden"
          >
            Hide header · more room to read
          </button>
        ) : null}
        {expanded}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="truncate text-base font-bold text-zinc-50">{title}</div>
        {subtitle ? <div className="truncate text-xs text-zinc-500">{subtitle}</div> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {collapsedExtra}
        <button
          type="button"
          onClick={() => setExpandedManual(true)}
          className="rounded-lg border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-400"
        >
          Details
        </button>
      </div>
    </div>
  );
}
