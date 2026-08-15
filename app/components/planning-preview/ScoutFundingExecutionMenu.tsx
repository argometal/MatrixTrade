"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { SnapshotButton } from "@/app/components/preview/SnapshotButton";
import { MtaHelpLink } from "@/app/components/preview/MtaHelpLink";
import type { SnapshotMenuItem } from "@/lib/snapshot-types";

/**
 * Single Funding & execution control for the Scout card (29-48).
 * Presentation only — reuses existing handlers / links.
 */
export function ScoutFundingExecutionMenu({
  fundingSnapshotItem,
  prepareTrade,
  prepareDisabled,
  prepareLabel,
  blockers = [],
}: {
  fundingSnapshotItem?: SnapshotMenuItem | null;
  prepareTrade: () => void;
  prepareDisabled: boolean;
  prepareLabel: string;
  blockers?: string[];
}) {
  return (
    <div className="mt-3" data-scout-funding-execution-menu>
      <details className="rounded-xl border border-current/20 bg-black/10">
        <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium opacity-90 hover:opacity-100 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5">
              <span>Funding &amp; execution</span>
              <span
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onKeyDown={(e) => e.stopPropagation()}
                className="inline-flex"
              >
                <MtaHelpLink topic="scout-funding" label="Funding & execution" />
              </span>
            </span>
            <span className="opacity-60">▾</span>
          </span>
        </summary>
        <div className="space-y-1 border-t border-current/15 px-2 py-2">
          {fundingSnapshotItem ? (
            <MenuRow>
              <span
                data-scout-funding-snapshot
                data-scout-case-funding-snapshot
                className="block w-full"
              >
                <SnapshotButton
                  title="Scout Funding Snapshot"
                  description="Canonical package for capital-reservation-create — read-only"
                  items={[fundingSnapshotItem]}
                  className="!w-full !justify-start !px-2.5 !py-1.5 !text-left"
                />
              </span>
            </MenuRow>
          ) : (
            <MenuRow muted>Scout Funding Snapshot unavailable</MenuRow>
          )}
          <MenuRow>
            <Link
              href="/planning/capital"
              className="block w-full rounded-lg px-2.5 py-1.5 text-xs hover:bg-black/20"
            >
              Calculate allocation
            </Link>
          </MenuRow>
          <MenuRow>
            <Link
              href="/planning/capital/allocation"
              className="block w-full rounded-lg px-2.5 py-1.5 text-xs hover:bg-black/20"
            >
              Open Allocation Board
            </Link>
          </MenuRow>
          <MenuRow>
            <Link
              href="/planning/capital"
              className="block w-full rounded-lg px-2.5 py-1.5 text-xs hover:bg-black/20"
            >
              Open Capital Planner
            </Link>
          </MenuRow>
          <MenuRow>
            <button
              type="button"
              data-scout-prepare-trade
              disabled={prepareDisabled}
              title={
                prepareDisabled
                  ? "Canonical share count is required."
                  : undefined
              }
              onClick={prepareTrade}
              className={
                prepareDisabled
                  ? "w-full cursor-not-allowed rounded-lg px-2.5 py-1.5 text-left text-xs text-zinc-500"
                  : "w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-emerald-200 hover:bg-emerald-500/10"
              }
            >
              {prepareLabel}
            </button>
          </MenuRow>
        </div>
      </details>
      {blockers.length > 0 ? (
        <ul className="mt-1.5 space-y-0.5 text-[11px] opacity-80">
          {blockers.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function MenuRow({
  children,
  muted,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <div className={muted ? "px-2.5 py-1.5 text-xs opacity-50" : undefined}>
      {children}
    </div>
  );
}
