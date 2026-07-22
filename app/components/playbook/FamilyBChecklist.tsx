import Link from "next/link";
import {
  FAMILY_B_CHECKLIST,
  isSecularTrendContinuationPlaybook,
} from "@/lib/playbook-family-b";

/** Compact Family B calibration strip — only when Trend Continuation playbook is active. */
export function FamilyBChecklist({
  playbookId,
  compact = false,
}: {
  playbookId?: string | null;
  compact?: boolean;
}) {
  if (!isSecularTrendContinuationPlaybook(playbookId)) return null;

  const groups = new Map<string, typeof FAMILY_B_CHECKLIST>();
  for (const item of FAMILY_B_CHECKLIST) {
    const g = item.group ?? "GENERAL";
    const list = groups.get(g) ?? [];
    list.push(item);
    groups.set(g, list);
  }

  return (
    <section
      className={
        compact
          ? "rounded-xl border border-sky-500/30 bg-sky-950/20 p-3"
          : "rounded-xl border border-sky-500/30 bg-sky-950/20 p-4"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-200/90">
          Family B · Trend continuation
        </p>
        <Link
          href="/playbook"
          className="text-[11px] text-sky-300/80 hover:underline"
        >
          Playbook →
        </Link>
      </div>
      <p className="mt-1 text-xs text-sky-100/60">
        Starter ≠ full entry · preferred usually largest · Fib context only · no chase.
      </p>
      <div className="mt-3 space-y-3">
        {[...groups.entries()].map(([group, items]) => (
          <div key={group}>
            {!compact ? (
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-sky-500/70">
                {group}
              </p>
            ) : null}
            <ul className="space-y-1.5">
              {items.map((item) => (
                <li key={item.id} className="flex gap-2 text-xs text-sky-100/85">
                  <span className="mt-0.5 text-sky-400/70" aria-hidden>
                    ○
                  </span>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
