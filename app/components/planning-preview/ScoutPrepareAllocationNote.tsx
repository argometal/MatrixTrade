"use client";

import Link from "next/link";
import { useScoutAllocationSelection } from "./ScoutAllocationProvider";

/**
 * Prepare-trade note that respects canonical shares (26-50)
 * and allocation selection (26-55) without inventing shares.
 */
export function ScoutPrepareAllocationNote({
  hasCanonicalShares,
  prepareMsg,
  linksInNote = true,
}: {
  hasCanonicalShares: boolean;
  prepareMsg: string;
  /** When false, board/planner links are omitted (shown once in Funding & execution). */
  linksInNote?: boolean;
}) {
  const { selectionOrder } = useScoutAllocationSelection();
  // When shares missing: always show allocation guidance.
  // If also selected in allocation board, clarify shares remain unconfigured.
  if (!hasCanonicalShares) {
    const selectedSomewhere = selectionOrder.length > 0;
    return (
      <p
        className="mt-2 text-[11px] opacity-80"
        data-scout-prepare-allocation-msg
      >
        {selectedSomewhere
          ? "Allocation selected · share count still unconfigured"
          : "Share count unconfigured — calculate allocation first"}
        {linksInNote ? (
          <span className="mt-1 flex flex-wrap gap-2">
            <Link
              href="/mta/planning/capital/allocation"
              className="underline opacity-90 hover:opacity-100"
            >
              Allocation Board
            </Link>
            <Link
              href="/mta/planning/capital"
              className="underline opacity-90 hover:opacity-100"
            >
              Capital Planner
            </Link>
          </span>
        ) : null}
      </p>
    );
  }
  if (prepareMsg) {
    return <p className="mt-2 text-[11px] opacity-80">{prepareMsg}</p>;
  }
  return null;
}
