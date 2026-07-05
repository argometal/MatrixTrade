import Link from "next/link";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { STRATEGIC_VALUE_LABELS } from "@/lib/argus/labels";
import { entityNotesForDisplay } from "@/lib/argus/reference-types";
import { getEntity, getInboxItems, readArgus } from "@/lib/argus/server-storage";
import { loadOrganizationPageData } from "@/lib/argus/v2/loaders";
import { V2Badge, V2BackLink, V2Card, V2SectionTitle } from "../../components/v2-ui";
import { V2Timeline } from "../../components/V2Timeline";
import { EmptyState } from "@/app/argus/components/ui";

export default async function V2OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const includePrivate = await hasArgusPrivateUnlock();
  const entity = await getEntity(id);

  if (!entity || entity.type !== "company") {
    return (
      <div className="px-4 py-6 lg:px-8">
        <V2BackLink href="/argus/v2/browse/organizations">Back to Organizations</V2BackLink>
        <EmptyState message="Organization not found." />
      </div>
    );
  }

  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const today = new Date().toISOString().slice(0, 10);
  const page = loadOrganizationPageData(data, inboxItems, entity, includePrivate, today);
  const notes = entityNotesForDisplay(entity.notes ?? "");
  const sv = entity.strategicValue ?? 3;

  return (
    <div className="px-4 py-6 lg:px-8">
      <div className="mb-4">
        <V2BackLink href="/argus/v2/browse/organizations">Back to Organizations</V2BackLink>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <span className="text-2xl">🏢</span>
            <h1 className="text-2xl font-bold text-zinc-50">{entity.name}</h1>
            <V2Badge tone="orange">Organization</V2Badge>
          </div>
          {notes ? <p className="text-sm text-zinc-500">{notes}</p> : null}
          {entity.alias ? <p className="mt-1 text-xs text-zinc-600">{entity.alias}</p> : null}
        </div>
      </div>

      <p className="mb-6 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-xs text-zinc-500">
        <strong className="text-zinc-400">Org scope:</strong> timeline shows evidence{" "}
        <em>directly linked</em> to this organization (all time). Linked people are roster only — not their
        personal files.
      </p>

      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatMini label="Journal Entries" value={String(page.stats.journalEntries)} />
            <StatMini label="Emails" value={String(page.stats.emails)} />
            <StatMini label="People" value={String(page.stats.people)} linkLabel="Roster" />
            <StatMini label="Projects" value={String(page.stats.projects)} linkLabel="Linked" />
          </div>

          <p className="flex flex-wrap gap-4 text-xs text-zinc-600">
            <span>First contact: {page.stats.firstContact}</span>
            <span className="inline-flex items-center gap-1.5">
              Last activity: {page.stats.lastActivity}
            </span>
          </p>

          <V2Card className="p-5">
            <V2SectionTitle>Organization Timeline</V2SectionTitle>
            <p className="mb-5 text-xs text-zinc-500">
              All time · Chronological · direct org links · Log = recurring, Note = one-time (
              <code className="text-zinc-400">log.kind</code>)
            </p>
            {page.timeline.length === 0 ? (
              <p className="text-sm text-zinc-500">No linked journal entries or emails yet.</p>
            ) : (
              <V2Timeline entries={page.timeline} />
            )}
          </V2Card>
        </div>

        <aside className="space-y-5">
          <V2Card className="p-5">
            <V2SectionTitle>Relationship</V2SectionTitle>
            <div className="mb-2 flex items-end gap-2">
              <span className="text-4xl font-bold text-zinc-50">{sv}</span>
              <span className="pb-1 text-sm text-zinc-500">/ 5</span>
            </div>
            <p className="mb-3 text-sm text-emerald-400">{STRATEGIC_VALUE_LABELS[sv as 1 | 2 | 3 | 4 | 5]}</p>
            <p className="text-xs text-zinc-600">
              Health: {page.intel.relationshipHealth} · Outcome score: {page.intel.outcomeScore}
            </p>
          </V2Card>

          <V2Card className="p-5">
            <V2SectionTitle>Linked People</V2SectionTitle>
            {page.linkedPeople.length === 0 ? (
              <p className="text-sm text-zinc-500">Link people on the organization record.</p>
            ) : (
              <ul className="space-y-3">
                {page.linkedPeople.map((person) => (
                  <li key={person.id} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600/20 text-xs font-bold text-violet-200">
                      {initials(person.name)}
                    </div>
                    <div>
                      <Link
                        href={`/argus/network/${person.id}`}
                        className="text-sm font-medium text-zinc-200 hover:text-violet-300"
                      >
                        {person.name}
                      </Link>
                      <p className="text-xs text-zinc-500">{person.alias || "Person"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </V2Card>

          <V2Card className="p-5">
            <V2SectionTitle>Linked Projects</V2SectionTitle>
            {page.orgProjects.length === 0 ? (
              <p className="text-sm text-zinc-500">Link this org on a project record.</p>
            ) : (
              <ul className="space-y-3">
                {page.orgProjects.slice(0, 5).map((project) => (
                  <li key={project.id}>
                    <Link
                      href={`/argus/v2/projects/${project.id}`}
                      className="block rounded-xl border border-zinc-800/60 px-3 py-2.5 hover:border-zinc-700"
                    >
                      <p className="text-sm font-medium text-zinc-200">{project.name}</p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {project.startDate ? `${project.startDate} – ${project.endDate ?? "open"}` : "No dates"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </V2Card>

          <V2Card className="p-5">
            <V2SectionTitle>Production page</V2SectionTitle>
            <Link href={`/argus/network/${entity.id}`} className="text-sm text-violet-400 hover:text-violet-300">
              Open legacy network view →
            </Link>
          </V2Card>
        </aside>
      </div>
    </div>
  );
}

function StatMini({
  label,
  value,
  linkLabel,
}: {
  label: string;
  value: string;
  linkLabel?: string;
}) {
  return (
    <V2Card className="p-4">
      <p className="text-2xl font-bold tabular-nums text-zinc-50">{value}</p>
      <p className="mt-2 text-xs text-zinc-500">{label}</p>
      {linkLabel ? <p className="mt-1 text-[10px] text-violet-400">{linkLabel}</p> : null}
    </V2Card>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
