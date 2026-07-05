"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { refreshArgusInboxFromEmailAction } from "@/app/argus/actions";
import type { HealthLevel } from "@/lib/argus/health/status";

type ArgusInboxStatusRowProps = {
  label: string;
  level: HealthLevel;
  icon: string;
  lastCheckedLabel: string;
  count?: number;
  reason?: string;
};

function levelLabel(level: HealthLevel): string {
  if (level === "healthy") return "Healthy";
  if (level === "degraded") return "Degraded";
  return "Offline";
}

export function ArgusInboxStatusRow({
  label,
  level,
  icon,
  lastCheckedLabel,
  count,
  reason,
}: ArgusInboxStatusRowProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function refresh() {
    setFeedback(null);
    startTransition(async () => {
      const result = await refreshArgusInboxFromEmailAction();
      if (result.ok) {
        setFeedback(
          result.count === 0
            ? "Inbox empty — send mail to your ARGUS intake address"
            : `${result.count.toLocaleString()} record${result.count === 1 ? "" : "s"} loaded`
        );
      } else {
        setFeedback(result.message ?? "Refresh failed");
      }
      router.refresh();
    });
  }

  return (
    <li className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm text-zinc-200">
          {icon} {label}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={pending}
            title="Reload inbox from the database. New messages arrive via email routing."
            className="rounded-lg border border-zinc-700/80 px-2 py-0.5 text-[11px] text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Refreshing…" : "Refresh from emails"}
          </button>
          <span className="text-[11px] capitalize text-zinc-500">{levelLabel(level)}</span>
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-600">
        <span>Last checked {lastCheckedLabel}</span>
        {count !== undefined ? <span>{count.toLocaleString()} records</span> : null}
        {reason ? <span className="text-amber-400/90">{reason}</span> : null}
        {feedback ? (
          <span className={feedback.includes("failed") ? "text-red-400/90" : "text-teal-400/90"}>
            {feedback}
          </span>
        ) : null}
      </div>
    </li>
  );
}
