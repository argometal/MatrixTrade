"use client";

import Link from "next/link";
import {
  buildFundingReadinessPanelModel,
  formatCapitalReservationProposalBlock,
  type FundingFollowUpResult,
} from "@/lib/scout-funding-follow-up";

/**
 * Post-Accept funding readiness panel (29-21).
 * Prepare Funding JSON only — never auto-Accept / never mutates capital.
 */
export function FundingFollowUpPanel({
  followUp,
  onPrepare,
  onDismiss,
}: {
  followUp: FundingFollowUpResult;
  onPrepare?: (json: string) => void;
  onDismiss?: () => void;
}) {
  const model = buildFundingReadinessPanelModel(followUp);

  function handlePrepare() {
    if (!followUp.suggestedBlock || !onPrepare) return;
    onPrepare(formatCapitalReservationProposalBlock(followUp.suggestedBlock));
  }

  return (
    <section
      className="rounded-2xl border border-sky-500/35 bg-sky-950/25 px-4 py-4"
      data-funding-follow-up
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-400/80">
            Scout updated · Funding readiness
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-sky-100">
            {model.title}
          </h3>
        </div>
        {followUp.planId ? (
          <Link
            href={`/mxt/planning?plan=${encodeURIComponent(followUp.planId)}`}
            className="rounded-lg border border-sky-500/40 px-2.5 py-1 text-[10px] font-medium text-sky-200 hover:bg-sky-500/10"
          >
            Review Scout
          </Link>
        ) : null}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        {(
          [
            ["Requested capital", model.requestedCapital],
            ["Authorized risk", model.authorizedRisk],
            ["Actual rounded risk", model.actualRoundedRisk],
            ["Unused risk", model.unusedRisk],
            ["Capital not allocated", model.capitalNotAllocated],
            ["Canonical shares", model.canonicalShares],
            ["Review date", model.reviewDate],
            ["Reservation status", model.reservationStatus],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[10px] uppercase tracking-wide text-sky-400/60">
              {label}
            </dt>
            <dd className="mt-0.5 font-medium tabular-nums text-sky-50">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-2 text-[10px] text-sky-300/70">
        Expiration source: {model.expirationSource}
      </p>

      {model.unavailableReason ? (
        <p
          className="mt-2 text-xs text-amber-200/90"
          data-funding-follow-up-unavailable
        >
          {model.unavailableReason}
        </p>
      ) : null}

      {model.stale ? (
        <p className="mt-2 text-xs text-amber-200/90">
          Reservation stale — Scout funding parameters changed. Release the old
          reservation before preparing a replacement.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {model.canPrepare ? (
          <button
            type="button"
            data-funding-prepare-json
            onClick={handlePrepare}
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-100 hover:bg-emerald-500/25"
          >
            Prepare Funding JSON
          </button>
        ) : null}
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg border border-zinc-600 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Dismiss
          </button>
        ) : null}
      </div>

      <p className="mt-2 text-[10px] text-zinc-500">
        Prepared proposal does not reserve capital. Control → Apply → Validate →
        Accept remains mandatory.
      </p>
    </section>
  );
}
