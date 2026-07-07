import Link from "next/link";
import type { ReactNode } from "react";

export function V2PanelCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-zinc-800/90 bg-zinc-950/40 p-5 shadow-sm shadow-black/20 ${className}`}
    >
      {children}
    </div>
  );
}

export function V2PanelHeader({
  title,
  action,
  editHref,
}: {
  title: string;
  action?: ReactNode;
  editHref?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
      <div className="flex items-center gap-2">
        {action}
        {editHref ? (
          <Link
            href={editHref}
            className="text-zinc-400 transition hover:text-zinc-300"
            aria-label={`Edit ${title.toLowerCase()}`}
          >
            ✎
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function V2PanelLinkAction({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-medium text-violet-400 transition hover:text-violet-300">
      {children}
    </Link>
  );
}

export function V2Avatar({
  initials,
  tone = "sky",
  size = "md",
}: {
  initials: string;
  tone?: "sky" | "violet" | "emerald" | "amber";
  size?: "sm" | "md";
}) {
  const tones = {
    sky: "from-sky-600/50 to-zinc-700 text-sky-100",
    violet: "from-violet-600/50 to-zinc-700 text-violet-100",
    emerald: "from-emerald-600/50 to-zinc-700 text-emerald-100",
    amber: "from-amber-600/50 to-zinc-700 text-amber-100",
  };
  const sizes = {
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-sm",
  };
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold ${tones[tone]} ${sizes[size]}`}
    >
      {initials}
    </div>
  );
}

export function V2PersonListItem({
  href,
  name,
  subtitle,
  initials,
  badge,
  active,
}: {
  href: string;
  name: string;
  subtitle: string;
  initials: string;
  badge?: ReactNode;
  active?: boolean;
}) {
  return (
    <li className="flex items-center gap-3">
      <V2Avatar initials={initials} tone="sky" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={href} className="text-sm font-medium text-zinc-100 transition hover:text-violet-300">
            {name}
          </Link>
          {badge}
        </div>
        <p className="truncate text-sm text-zinc-400">{subtitle}</p>
      </div>
      {active ? <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" title="Active" /> : null}
    </li>
  );
}

export function V2MorePeopleHint({
  people,
  moreCount,
}: {
  people: { initials: string }[];
  moreCount: number;
}) {
  if (moreCount <= 0) return null;
  return (
    <div className="mt-4 flex items-center gap-2">
      <div className="flex -space-x-2">
        {people.slice(0, 3).map((person, index) => (
          <div
            key={`${person.initials}-${index}`}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-950 bg-zinc-700 text-sm font-bold text-zinc-200"
          >
            {person.initials}
          </div>
        ))}
      </div>
      <span className="text-sm font-medium text-violet-400">+{moreCount} more</span>
    </div>
  );
}

export function V2MetricRows({
  metrics,
}: {
  metrics: { label: string; value: string; highlight?: boolean; trend?: "up" | "down" }[];
}) {
  return (
    <ul className="space-y-3">
      {metrics.map((metric) => (
        <li key={metric.label} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-zinc-400">{metric.label}</span>
          <span
            className={`inline-flex items-center gap-1 font-semibold tabular-nums ${
              metric.highlight ? "text-emerald-400" : "text-zinc-100"
            }`}
          >
            {metric.trend === "up" ? <span className="text-emerald-400">↑</span> : null}
            {metric.trend === "down" ? <span className="text-red-400">↓</span> : null}
            {metric.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

const LINKED_ENTITY_ICONS = {
  organization: { icon: "🏢", box: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20" },
  topics: { icon: "🏷", box: "bg-amber-500/15 text-amber-400 ring-amber-500/20" },
  events: { icon: "📅", box: "bg-red-500/15 text-red-400 ring-red-500/20" },
  project: { icon: "📁", box: "bg-sky-500/15 text-sky-400 ring-sky-500/20" },
} as const;

export function V2LinkedEntityRow({
  kind,
  label,
  href,
  value,
  tags,
}: {
  kind: keyof typeof LINKED_ENTITY_ICONS;
  label: string;
  href?: string;
  value?: string;
  tags?: string[];
}) {
  const style = LINKED_ENTITY_ICONS[kind];
  const inner = (
    <>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base ring-1 ${style.box}`}
      >
        {style.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-400">{label}</p>
        {tags && tags.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-sm font-medium text-zinc-300"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-0.5 truncate text-base font-medium text-zinc-200">{value}</p>
        )}
      </div>
      {href ? <span className="shrink-0 text-zinc-400">→</span> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-3 py-3 transition hover:border-zinc-700 hover:bg-zinc-900/50"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-3 py-3">
      {inner}
    </div>
  );
}

export function V2ProjectListItem({
  href,
  name,
  status,
  year,
  statusTone,
}: {
  href: string;
  name: string;
  status: string;
  year: string;
  statusTone: "green" | "blue" | "amber";
}) {
  const toneClass =
    statusTone === "green"
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
      : statusTone === "blue"
        ? "bg-sky-500/15 text-sky-300 ring-sky-500/30"
        : "bg-amber-500/15 text-amber-300 ring-amber-500/30";

  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-3 transition hover:border-zinc-700 hover:bg-zinc-900/50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-base text-sky-400 ring-1 ring-sky-500/20">
        📁
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-zinc-100 line-clamp-2">{name}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-sm font-medium ring-1 ${toneClass}`}>
            {status}
          </span>
          <span className="text-sm text-zinc-400">{year}</span>
        </div>
      </div>
    </Link>
  );
}

export function V2LegacyLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <V2PanelCard className="py-4">
      <Link href={href} className="text-sm text-zinc-400 transition hover:text-violet-400">
        {children}
      </Link>
    </V2PanelCard>
  );
}

const SUMMARY_STAT_ICONS: Record<string, { icon: string; box: string }> = {
  journal: { icon: "📓", box: "text-violet-400" },
  email: { icon: "✉", box: "text-sky-400" },
  people: { icon: "👤", box: "text-emerald-400" },
  projects: { icon: "📁", box: "text-sky-300" },
};

export function V2SummaryStatCard({
  kind,
  value,
  label,
  delta,
  href,
  linkLabel,
}: {
  kind: keyof typeof SUMMARY_STAT_ICONS;
  value: string;
  label: string;
  delta?: string;
  href: string;
  linkLabel?: string;
}) {
  const style = SUMMARY_STAT_ICONS[kind];
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-zinc-800/90 bg-zinc-950/40 p-4 transition hover:border-violet-500/30 hover:bg-zinc-900/50"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className={`text-lg ${style.box}`}>{style.icon}</span>
        {delta ? <span className="text-sm text-emerald-400">{delta}</span> : null}
      </div>
      <p className="text-2xl font-bold tabular-nums text-zinc-50 group-hover:text-violet-100">{value}</p>
      <p className="mt-2 text-sm text-zinc-400">{label}</p>
      {linkLabel ? (
        <span className="mt-1 text-sm text-violet-400 group-hover:text-violet-300">{linkLabel}</span>
      ) : null}
    </Link>
  );
}

export function V2ContactPill({ label, value, active }: { label: string; value: string; active?: boolean }) {
  return (
    <div className="flex flex-1 flex-col justify-center rounded-2xl border border-zinc-800/90 bg-zinc-950/40 px-4 py-3">
      <p className="text-sm font-medium uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-base font-medium text-zinc-200">
        {active ? <span className="h-2 w-2 rounded-full bg-emerald-500" /> : null}
        {value}
      </p>
    </div>
  );
}
