"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { V2CreateEntityButton } from "@/app/argus/v2/components/V2CreateEntityButton";
import { V2ProjectActions } from "@/app/argus/v2/components/V2ProjectActions";
import { V2BrowseStatusFilter } from "@/app/argus/v2/components/V2BrowseStatusFilter";
import { V2Badge } from "../../../components/v2-ui";
import type {
  V2ProjectBrowseCard,
  V2ProjectBrowseStatus,
  V2ProjectBrowseSummary,
} from "@/lib/argus/v2/project-browse-utils";

function badgeTone(tone: V2ProjectBrowseCard["statusTone"]): "default" | "green" | "blue" | "amber" | "orange" {
  if (tone === "zinc") return "default";
  return tone;
}

const METRIC_ICONS = {
  people: "👤",
  journal: "📓",
  emails: "✉",
  files: "📎",
  topics: "🏷",
} as const;

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-50">{value}</p>
    </div>
  );
}

function ProjectCard({
  card,
  privateConfigured,
  privateUnlocked,
}: {
  card: V2ProjectBrowseCard;
  privateConfigured: boolean;
  privateUnlocked: boolean;
}) {
  return (
    <div className="group relative rounded-2xl border border-zinc-800/80 bg-zinc-900/50 transition hover:border-violet-500/40 hover:bg-zinc-900/80">
      <div className="absolute right-3 top-3 z-10">
        <V2ProjectActions
          projectId={card.id}
          projectName={card.name}
          href={card.href}
          hasPrivateEvidence={card.hasPrivateEvidence}
          privateConfigured={privateConfigured}
          privateUnlocked={privateUnlocked}
        />
      </div>
      <Link href={card.href} className="block p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <V2Badge tone={badgeTone(card.statusTone)}>{card.status}</V2Badge>
        <span className="text-xs text-zinc-600 group-hover:text-violet-400">Open →</span>
      </div>

      <h2 className="text-xl font-bold text-zinc-50 group-hover:text-violet-100">{card.name}</h2>

      {card.dateRangeLabel ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
          <span aria-hidden>📅</span>
          {card.dateRangeLabel}
        </p>
      ) : null}

      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-400">{card.description}</p>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {(Object.keys(METRIC_ICONS) as (keyof typeof METRIC_ICONS)[]).map((key) => (
          <div key={key} className="text-center">
            <div className="text-base" aria-hidden>
              {METRIC_ICONS[key]}
            </div>
            <p className="mt-1 text-sm font-semibold tabular-nums text-violet-300">{card.metrics[key]}</p>
            <p className="text-[9px] capitalize text-zinc-600">{key}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5">
        <p className="truncate text-sm text-zinc-300">{card.lastActivity.label}</p>
        <p className="mt-0.5 text-xs text-zinc-600">{card.lastActivity.timeLabel}</p>
      </div>

      {card.progressPercent !== undefined ? (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-zinc-500">Duration progress</span>
            <span className="font-medium tabular-nums text-violet-300">{card.progressPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400"
              style={{ width: `${card.progressPercent}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <div className="flex -space-x-2">
          {card.team.map((member) => (
            <span
              key={member.id}
              title={member.name}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-900 bg-gradient-to-br from-violet-600/40 to-zinc-700 text-[10px] font-bold text-violet-100"
            >
              {member.initials}
            </span>
          ))}
        </div>
        {card.teamOverflow > 0 ? (
          <span className="text-xs text-zinc-600">+{card.teamOverflow} more</span>
        ) : card.team.length === 0 ? (
          <span className="text-xs text-zinc-600">No people linked yet</span>
        ) : null}
      </div>
    </Link>
    </div>
  );
}

function ProjectListRow({
  card,
  privateConfigured,
  privateUnlocked,
}: {
  card: V2ProjectBrowseCard;
  privateConfigured: boolean;
  privateUnlocked: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 transition hover:border-violet-500/30 hover:bg-zinc-900/70">
      <Link href={card.href} className="flex min-w-0 flex-1 items-center gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-zinc-100">{card.name}</p>
          <V2Badge tone={badgeTone(card.statusTone)}>{card.status}</V2Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {card.dateRangeLabel ?? "No dates"} · {card.lastActivity.label} · {card.lastActivity.timeLabel}
        </p>
      </div>
      <div className="hidden shrink-0 gap-4 text-center sm:flex">
        <span className="text-xs text-zinc-500">
          <span className="block font-semibold text-violet-300">{card.metrics.people}</span>
          People
        </span>
        <span className="text-xs text-zinc-500">
          <span className="block font-semibold text-violet-300">{card.metrics.emails}</span>
          Emails
        </span>
        <span className="text-xs text-zinc-500">
          <span className="block font-semibold text-violet-300">{card.metrics.journal}</span>
          Journal
        </span>
      </div>
      </Link>
      <div className="shrink-0 pr-3">
        <V2ProjectActions
          projectId={card.id}
          projectName={card.name}
          href={card.href}
          hasPrivateEvidence={card.hasPrivateEvidence}
          privateConfigured={privateConfigured}
          privateUnlocked={privateUnlocked}
        />
      </div>
    </div>
  );
}

export function V2ProjectsBrowserShell({
  cards,
  summary,
  privateConfigured,
  privateUnlocked,
}: {
  cards: V2ProjectBrowseCard[];
  summary: V2ProjectBrowseSummary;
  privateConfigured: boolean;
  privateUnlocked: boolean;
}) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<V2ProjectBrowseStatus | "all">("all");

  const sorted = useMemo(() => cards, [cards]);
  const filtered = useMemo(
    () => (statusFilter === "all" ? sorted : sorted.filter((c) => c.status === statusFilter)),
    [sorted, statusFilter]
  );

  return (
    <div className="v2-browse-shell flex h-full min-h-0 flex-col overflow-hidden">
      <div className="argus-v2-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="px-4 py-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Projects</h1>
          <p className="mt-1 text-sm text-zinc-500">All projects in your knowledge base</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                view === "grid" ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
              }`}
              aria-label="Grid view"
            >
              ▦
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                view === "list" ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
              }`}
              aria-label="List view"
            >
              ☰
            </button>
          </div>
          <V2BrowseStatusFilter
            label="Filters"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All statuses" },
              { value: "Planning", label: "Planning" },
              { value: "Active", label: "Active" },
              { value: "On Hold", label: "On Hold" },
              { value: "Completed", label: "Completed" },
              { value: "Archived", label: "Archived" },
            ]}
          />
          <V2CreateEntityButton
            kind="project"
            label="+ Project"
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
          />
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryPill label="Total" value={summary.total} />
        <SummaryPill label="Active" value={summary.active} />
        <SummaryPill label="Planning" value={summary.planning} />
        <SummaryPill label="On Hold" value={summary.onHold} />
        <SummaryPill label="Completed" value={summary.completed} />
        <SummaryPill label="Archived" value={summary.archived} />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
          <p className="text-sm text-zinc-500">No projects yet.</p>
          <p className="mt-1 text-xs text-zinc-600">Capture one and link org, people, topics, or events.</p>
          <div className="mt-4">
            <V2CreateEntityButton
              kind="project"
              label="+ Project"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
            />
          </div>
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((card) => (
            <ProjectCard
              key={card.id}
              card={card}
              privateConfigured={privateConfigured}
              privateUnlocked={privateUnlocked}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((card) => (
            <ProjectListRow
              key={card.id}
              card={card}
              privateConfigured={privateConfigured}
              privateUnlocked={privateUnlocked}
            />
          ))}
        </div>
      )}

      <section className="mt-10 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 px-5 py-4">
        <h2 className="text-sm font-semibold text-zinc-200">Why this view helps</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          The browser is your portfolio — decide which project to open before you dive into evidence. Each card
          shows status, team, maturity, and recent activity so you can tell in seconds whether a project is alive
          and worth entering.
        </p>
      </section>
        </div>
      </div>
    </div>
  );
}
