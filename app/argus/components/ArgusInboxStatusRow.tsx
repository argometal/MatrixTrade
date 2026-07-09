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
    <li className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-3 transition hover:border-zinc-700/80">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-zinc-200">
          <span className="mr-1.5" aria-hidden>
            {icon}
          </span>
          {label}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={pending}
            title="Reload inbox from the database. New messages arrive via email routing."
            className="rounded-lg border border-violet-800/50 bg-violet-950/30 px-2.5 py-1 text-[11px] font-medium text-violet-300 transition hover:bg-violet-900/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Refreshing…" : "Refresh from emails"}
          </button>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              level === "healthy"
                ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                : level === "degraded"
                  ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
                  : "bg-red-500/15 text-red-300 ring-1 ring-red-500/30"
            }`}
          >
            {levelLabel(level)}
          </span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
        <span>Last checked {lastCheckedLabel}</span>
        {count !== undefined ? <span>{count.toLocaleString()} records</span> : null}
        {reason ? <span className="text-amber-300/90">{reason}</span> : null}
        {feedback ? (
          <span className={feedback.includes("failed") ? "text-red-400/90" : "text-violet-300/90"}>
            {feedback}
          </span>
        ) : null}
      </div>
    </li>
  );
}
