"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  href: string;
  icon: "folder" | "deck";
  title: string;
  /** e.g. item count shown as primary badge */
  primaryBadge: { label: string; tone: "quiet" | "hot" | "neutral" };
  /** secondary line under badge, e.g. "2 NEW" */
  secondaryBadge?: string;
  meta: ReactNode;
  menu?: ReactNode;
};

/** Dense library row — AlgoApp list layout, Chaos semantics. */
export function RepoListRow({
  href,
  icon,
  title,
  primaryBadge,
  secondaryBadge,
  meta,
  menu,
}: Props) {
  return (
    <li className="flex items-stretch border-b border-slate-100 last:border-b-0">
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5">
        <span
          aria-hidden
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            icon === "folder" ? "bg-amber-50 text-amber-500" : "bg-[#e8f2ff] text-[#2f80ed]"
          }`}
        >
          {icon === "folder" ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="4" width="18" height="6" rx="1" />
              <rect x="3" y="14" width="18" height="6" rx="1" />
            </svg>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-slate-900">{title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
            {meta}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-sm font-semibold tabular-nums text-slate-500">{primaryBadge.label}</span>
          {secondaryBadge ? (
            <span className="text-[10px] font-medium tracking-wide text-slate-400">{secondaryBadge}</span>
          ) : null}
        </span>
      </Link>
      {menu ? <div className="relative flex items-stretch">{menu}</div> : null}
    </li>
  );
}
