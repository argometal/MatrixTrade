import Link from "next/link";
import type { V2NavCounts } from "@/lib/argus/v2/loaders";

type PulseChip = {
  href: string;
  label: string;
  value: number;
  detail: string;
  icon: string;
};

function buildPulseChips(signals: V2NavCounts): PulseChip[] {
  const chips: PulseChip[] = [];

  if (signals.inbox > 0) {
    chips.push({
      href: "/argus/v2/inbox",
      label: "Inbox",
      value: signals.inbox,
      detail: "Unprocessed evidence",
      icon: "✉",
    });
  }
  if (signals.network > 0) {
    chips.push({
      href: "/argus/v2#follow-ups",
      label: "Follow-ups",
      value: signals.network,
      detail: "Due within 3 days or recently overdue",
      icon: "↩",
    });
  }
  if (signals.topics > 0) {
    chips.push({
      href: "/argus/v2/browse/topics",
      label: "Topics",
      value: signals.topics,
      detail: "Needs classification",
      icon: "🏷",
    });
  }

  return chips;
}

function V2HomeAttentionActions({ signals }: { signals: V2NavCounts }) {
  const chips = buildPulseChips(signals);

  if (chips.length === 0) {
    return (
      <p className="text-right text-xs text-zinc-600 sm:max-w-[14rem]">
        Nothing needs attention —{" "}
        <Link href="/argus/v2/inbox" className="text-violet-400 hover:text-violet-300">
          Inbox
        </Link>{" "}
        or{" "}
        <Link href="/argus/v2/browse/topics" className="text-violet-400 hover:text-violet-300">
          Browse
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2" role="list" aria-label="Items needing attention">
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={chip.href}
          role="listitem"
          title={chip.detail}
          className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-xs font-medium text-violet-200 transition hover:border-violet-500/60 hover:bg-violet-600/25"
        >
          <span aria-hidden>{chip.icon}</span>
          <span>{chip.label}</span>
          <span className="tabular-nums font-bold text-violet-50">{chip.value}</span>
        </Link>
      ))}
    </div>
  );
}

/** Home title row — action chips live on the right, not inside metric cards. */
export function V2HomePageHeader({
  signals,
  className = "",
}: {
  signals: V2NavCounts;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Home</h1>
        <p className="mt-1 text-sm text-zinc-500">Activity, intelligence, and what needs attention</p>
      </div>
      <div className="shrink-0 sm:pt-1">
        <V2HomeAttentionActions signals={signals} />
      </div>
    </div>
  );
}
