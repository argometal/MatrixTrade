import Link from "next/link";
import type { V2NavCounts } from "@/lib/argus/v2/loaders";

type PulseChip = {
  href: string;
  label: string;
  value: number;
  detail: string;
  icon: string;
  urgent?: boolean;
};

function PulseChipCard({ chip }: { chip: PulseChip }) {
  return (
    <Link
      href={chip.href}
      className={`group flex min-h-[4.25rem] flex-col justify-between rounded-xl border px-3.5 py-3 transition ${
        chip.urgent
          ? "border-violet-500/35 bg-violet-950/25 hover:border-violet-500/50 hover:bg-violet-950/35"
          : "border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-base opacity-80" aria-hidden>
          {chip.icon}
        </span>
        <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">
          Action
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums leading-none text-zinc-50">{chip.value}</p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">{chip.label}</p>
        <p className="mt-0.5 text-[10px] text-zinc-600">{chip.detail}</p>
      </div>
    </Link>
  );
}

/** Action-only attention strip — aligns with sidebar nav signals. */
export function V2HomePulse({ signals }: { signals: V2NavCounts }) {
  const chips: PulseChip[] = [];

  if (signals.inbox > 0) {
    chips.push({
      href: "/argus/v2/inbox",
      label: "Inbox",
      value: signals.inbox,
      detail: "Unprocessed evidence",
      icon: "✉",
      urgent: true,
    });
  }
  if (signals.network > 0) {
    chips.push({
      href: "/argus/v2#follow-ups",
      label: "Follow-ups",
      value: signals.network,
      detail: "Due today or overdue",
      icon: "↩",
      urgent: true,
    });
  }
  if (signals.topics > 0) {
    chips.push({
      href: "/argus/v2/browse/topics",
      label: "Topics",
      value: signals.topics,
      detail: "Needs classification",
      icon: "🏷",
      urgent: true,
    });
  }

  if (chips.length === 0) {
    return (
      <p className="mb-6 rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-500">
        Nothing needs attention — use{" "}
        <Link href="/argus/v2/inbox" className="text-violet-400 hover:text-violet-300">
          Inbox
        </Link>{" "}
        or{" "}
        <Link href="/argus/v2/browse/topics" className="text-violet-400 hover:text-violet-300">
          Browse
        </Link>{" "}
        to retrieve evidence.
      </p>
    );
  }

  return (
    <div
      className="mb-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
      role="list"
      aria-label="Items needing attention"
    >
      {chips.map((chip) => (
        <div key={chip.label} role="listitem">
          <PulseChipCard chip={chip} />
        </div>
      ))}
    </div>
  );
}
