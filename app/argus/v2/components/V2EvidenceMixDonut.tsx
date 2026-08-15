"use client";

import type { EvidenceMixSegment } from "@/lib/argus/v2/evidence-mix";
import { evidenceMixTotal } from "@/lib/argus/v2/evidence-mix";

/**
 * Experimental donut — binder / event evidence mix.
 * Not a dashboard KPI strip; one composition answering “what is this made of?”
 */
export function V2EvidenceMixDonut({
  segments,
  emptyLabel = "No evidence yet",
  size = "md",
  centerLabel,
}: {
  segments: EvidenceMixSegment[];
  emptyLabel?: string;
  size?: "sm" | "md";
  /** Optional center caption (e.g. total). */
  centerLabel?: string;
}) {
  const total = evidenceMixTotal(segments);
  const dim = size === "sm" ? 72 : 96;
  const radius = size === "sm" ? 26 : 34;
  const stroke = size === "sm" ? 8 : 10;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return (
      <div
        className={`flex items-center justify-center text-xs text-zinc-600 ${size === "sm" ? "h-16" : "h-24"}`}
      >
        {emptyLabel}
      </div>
    );
  }

  let offset = 0;
  const cx = dim / 2;

  return (
    <div className={`flex items-center gap-3 ${size === "sm" ? "gap-2.5" : "gap-4"}`}>
      <div className="relative shrink-0" style={{ width: dim, height: dim }}>
        <svg viewBox={`0 0 ${dim} ${dim}`} className="h-full w-full" aria-hidden>
          <circle cx={cx} cy={cx} r={radius} fill="none" stroke="#27272a" strokeWidth={stroke} />
          {segments.map((seg) => {
            if (seg.value <= 0) return null;
            const dash = (seg.value / total) * circumference;
            const el = (
              <circle
                key={seg.key}
                cx={cx}
                cy={cx}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${cx} ${cx})`}
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        {centerLabel ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-semibold tabular-nums text-zinc-200">{centerLabel}</span>
          </div>
        ) : null}
      </div>
      <ul className={`space-y-1 ${size === "sm" ? "text-[11px]" : "text-xs"} text-zinc-500`}>
        {segments.map((seg) => (
          <li key={seg.key} className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-zinc-400">{seg.label}</span>
            <span className="tabular-nums text-zinc-300">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
