"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { V2CreateEntityButton, V2EntityLinkButton } from "@/app/argus/v2/components/V2CreateEntityButton";
import { V2OpenCaptureButton } from "@/app/argus/v2/components/V2OpenCaptureButton";
import {
  buildV2EventTabCounts,
  filterV2EventRows,
  groupV2EventRows,
  parseV2EventTab,
  type V2EventDetail,
  type V2EventRow,
  type V2EventTab,
} from "@/lib/argus/v2/event-browse-utils";

const TABS: { id: V2EventTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
];

export function V2EventsShell({
  rows,
  details,
  initialSelectedId,
  initialTab,
}: {
  rows: V2EventRow[];
  details: V2EventDetail[];
  initialSelectedId?: string;
  initialTab?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseV2EventTab(searchParams.get("tab") ?? initialTab);
  const selectedId = searchParams.get("selected") ?? initialSelectedId ?? rows.find((r) => r.isUpcoming)?.id ?? rows[0]?.id;
  const counts = useMemo(() => buildV2EventTabCounts(rows), [rows]);
  const filtered = useMemo(() => filterV2EventRows(rows, tab), [rows, tab]);
  const groups = useMemo(() => groupV2EventRows(filtered), [filtered]);
  const selected = details.find((d) => d.id === selectedId);

  function setTab(next: V2EventTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/argus/v2/browse/events?${params.toString()}`);
  }

  function selectItem(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("selected", id);
    router.replace(`/argus/v2/browse/events?${params.toString()}`);
  }

  return (
    <div className="v2-browse-shell flex min-h-[calc(100vh-4.5rem)] flex-col lg:min-h-[calc(100vh-4rem)] lg:flex-row">
      <section className="flex w-full flex-col border-b border-zinc-800/80 lg:w-[min(480px,44%)] lg:border-b-0 lg:border-r">
        <div className="border-b border-zinc-800/80 px-4 py-4 lg:px-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-zinc-50">Events</h1>
              <p className="mt-0.5 text-sm text-zinc-400">Meetings, calls, milestones and occurrences</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <V2CreateEntityButton
                kind="event"
                label="+ Event"
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-500"
              />
              <button type="button" className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400">
                Filters
              </button>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium ${
                  tab === t.id ? "bg-violet-500/15 text-violet-300" : "text-zinc-400 hover:text-zinc-400"
                }`}
              >
                {t.label} {counts[t.id]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 lg:px-5">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-zinc-400">No events yet.</p>
              <p className="mt-1 text-sm text-zinc-400">Create an event and link it to projects, orgs, people, or topics.</p>
              <div className="mt-4">
                <V2CreateEntityButton
                  kind="event"
                  label="+ Event"
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
                />
              </div>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="mb-6">
                <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-400">{group.label}</p>
                <ul className="space-y-2">
                  {group.rows.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => selectItem(row.id)}
                        className={`flex w-full gap-3 rounded-xl border px-3 py-3 text-left transition hover:border-zinc-700 ${
                          selectedId === row.id
                            ? "border-violet-500/40 bg-violet-500/10"
                            : "border-zinc-800/80 bg-zinc-900/20"
                        }`}
                      >
                        <div className="w-12 shrink-0 text-center">
                          <p className="text-sm font-bold tracking-wide text-violet-400">{row.dateLabel}</p>
                          <p className="text-sm text-zinc-400">{row.timeLabel}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-zinc-100">{row.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                            {row.meetingUrl ? <span>Webex</span> : null}
                            {row.projectName ? <span>{row.projectName}</span> : null}
                            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-sm text-zinc-400">
                              {row.typeLabel}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 -space-x-1">
                          {row.attendeeInitials.slice(0, 3).map((initials, i) => (
                            <span
                              key={`${row.id}-${initials}-${i}`}
                              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-950 bg-zinc-700 text-sm font-bold text-zinc-200"
                            >
                              {initials}
                            </span>
                          ))}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="min-w-0 flex-1 overflow-y-auto bg-zinc-950/50">
        {selected ? (
          <div className="flex h-full flex-col p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-zinc-50">{selected.name}</h2>
              <div className="flex shrink-0 gap-2">
                <V2EntityLinkButton
                  entityId={selected.id}
                  linkedIds={selected.linkedEntityIds}
                  className="rounded-lg border border-violet-500/40 bg-violet-600/15 px-3 py-1.5 text-sm font-semibold text-violet-300 hover:bg-violet-600/25"
                />
                <div className="flex gap-2 text-zinc-400">
                  <Link href={`/argus/v2/network/${selected.id}`} className="hover:text-zinc-300">
                    ✎
                  </Link>
                  <span>✉</span>
                  <span>🗑</span>
                  <span>···</span>
                </div>
              </div>
            </div>

            <p className="mb-4 text-sm text-zinc-400">{selected.dateTimeLabel}</p>

            {selected.meetingUrl ? (
              <a
                href={selected.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="mb-4 inline-flex rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-300 hover:bg-sky-500/15"
              >
                Webex · Join meeting ↗
              </a>
            ) : null}

            {selected.projectName && selected.projectHref ? (
              <Link href={selected.projectHref} className="mb-4 block text-sm text-violet-400 hover:text-violet-300">
                📁 {selected.projectName}
              </Link>
            ) : null}

            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <LinkCountCard icon="🏢" label="Organizations" count={selected.orgCount} />
              <LinkCountCard icon="📁" label="Projects" count={selected.projectCount} />
              <LinkCountCard icon="👤" label="People" count={selected.peopleCount} />
              <LinkCountCard icon="🏷" label="Topics" count={selected.topicCount} />
            </div>

            {selected.linkedTopicNames.length > 0 ? (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {selected.linkedTopicNames.map((tag) => (
                  <span key={tag} className="rounded-md bg-zinc-800 px-2 py-1 text-sm text-zinc-400">
                    {tag}
                  </span>
                ))}
              </div>
            ) : selected.topicTags.length > 0 ? (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {selected.topicTags.map((tag) => (
                  <span key={tag} className="rounded-md bg-zinc-800 px-2 py-1 text-sm text-zinc-400">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mb-5 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">Description</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">{selected.description}</p>
            </div>

            {selected.attendeeCount > 0 ? (
              <div className="mb-5">
                <h3 className="mb-2 text-base font-semibold text-zinc-100">Attendees</h3>
                <div className="flex -space-x-2">
                  {selected.attendeeInitials.map((initials, i) => (
                    <span
                      key={`${selected.id}-att-${i}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-zinc-950 bg-zinc-700 text-sm font-bold text-zinc-200"
                    >
                      {initials}
                    </span>
                  ))}
                  {selected.attendeeCount > selected.attendeeInitials.length ? (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-zinc-950 bg-zinc-800 text-sm text-zinc-400">
                      +{selected.attendeeCount - selected.attendeeInitials.length}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <h3 className="mb-2 text-base font-semibold text-zinc-100">Linked entries</h3>
            {selected.linkedEntries.length === 0 ? (
              <p className="mb-5 text-sm text-zinc-400">No linked journal entries.</p>
            ) : (
              <ul className="mb-5 space-y-2">
                {selected.linkedEntries.map((entry) => (
                  <li key={entry.id}>
                    <Link href={entry.href} className="text-sm text-violet-400 hover:text-violet-300">
                      {entry.kind}: {entry.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="mb-2 text-base font-semibold text-zinc-100">
              Related emails ({selected.relatedEmails.length})
            </h3>
            {selected.relatedEmails.length === 0 ? (
              <p className="text-sm text-zinc-400">No linked emails.</p>
            ) : (
              <ul className="space-y-2">
                {selected.relatedEmails.map((email) => (
                  <li key={email.id}>
                    <Link
                      href={email.href}
                      className="block rounded-xl border border-zinc-800/80 px-3 py-2 transition hover:border-zinc-700"
                    >
                      <p className="text-base font-medium text-zinc-200">{email.subject}</p>
                      <p className="text-sm text-zinc-400">
                        {email.from} · {email.date}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 border-t border-zinc-800/80 pt-6">
              <V2OpenCaptureButton
                entityIds={[selected.id]}
                entryType="note"
                className="inline-flex rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
              >
                + Journal about this event
              </V2OpenCaptureButton>
              <p className="mt-2 text-sm text-zinc-400">
                Event notes use the event date. Link a topic, then convert to a log sequence.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[320px] items-center justify-center p-8 text-sm text-zinc-400">
            Select an event to view details.
          </div>
        )}
      </section>
    </div>
  );
}

function LinkCountCard({ icon, label, count }: { icon: string; label: string; count: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-4 text-center">
      <div className="text-2xl">{icon}</div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-50">{count}</p>
      <p className="mt-1 text-sm text-zinc-400">{label}</p>
    </div>
  );
}
