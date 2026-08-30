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

const TONE: Record<Props["primaryBadge"]["tone"], string> = {
  quiet: "bg-emerald-600 text-white",
  hot: "bg-rose-600 text-white",
  neutral: "bg-zinc-700 text-zinc-100",
};

/** Dense Active/Archive row — Anki-like layout, AF semantics. */
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
    <li className="flex items-stretch border-b border-zinc-800/80 last:border-b-0">
      <Link
        href={href}
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400"
      >
        <span
          aria-hidden
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
            icon === "folder" ? "bg-amber-500/15 text-amber-400" : "bg-sky-500/15 text-sky-400"
          }`}
        >
          {icon === "folder" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="4" width="18" height="6" rx="1" />
              <rect x="3" y="14" width="18" height="6" rx="1" />
            </svg>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-zinc-100">{title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
            {meta}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${TONE[primaryBadge.tone]}`}
          >
            {primaryBadge.label}
          </span>
          {secondaryBadge ? (
            <span className="text-[10px] font-semibold tracking-wide text-zinc-500">{secondaryBadge}</span>
          ) : null}
        </span>
        <span aria-hidden className="pl-1 text-zinc-600">
          ›
        </span>
      </Link>
      {menu ? <div className="relative flex items-stretch border-l border-zinc-800/80">{menu}</div> : null}
    </li>
  );
}
