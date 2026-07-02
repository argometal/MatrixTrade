import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { CompactEntityRow, CompactLogRow } from "@/app/argus/components/CompactRows";
import { PinnedEntities } from "@/app/argus/components/PinnedEntities";
import { PrivatePanel } from "@/app/argus/components/PrivatePanel";
import { Button, EmptyState, PageHeader } from "@/app/argus/components/ui";
import {
  getRecentActivity,
  getRecentlyAddedEntities,
  getUpcomingEvents,
  getUpcomingFollowUps,
} from "@/lib/argus/journal-helpers";
import { ENTITY_TYPE_LABELS } from "@/lib/argus/labels";
import { getEntities, getLogs } from "@/lib/argus/server-storage";

function CompactSection({
  title,
  children,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  if (empty) return null;
  return (
    <section className="mb-5">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</h2>
      <div className="rounded-xl border border-zinc-800/80 px-3">{children}</div>
    </section>
  );
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ private_error?: string }>;
}) {
  const { private_error } = await searchParams;
  const includePrivate = await hasArgusPrivateUnlock();
  const today = new Date().toISOString().slice(0, 10);
  const entities = await getEntities();
  const logs = await getLogs(includePrivate);

  const recentActivity = getRecentActivity(logs, 8);
  const upcomingFollowUps = getUpcomingFollowUps(logs, today, 5);
  const upcomingEvents = getUpcomingEvents(logs, today, 5);
  const recentEntities = getRecentlyAddedEntities(entities, 5);

  const hasContent =
    recentActivity.length > 0 ||
    upcomingFollowUps.length > 0 ||
    upcomingEvents.length > 0 ||
    recentEntities.length > 0;

  return (
    <>
      <PageHeader title="Journal" subtitle="Source of truth — facts, not notes" />
      <PrivatePanel privateError={Boolean(private_error)} />

      <Button href="/argus/new" fullWidth className="mb-5 py-3 text-sm">
        + New
      </Button>

      <PinnedEntities entities={entities} />

      <CompactSection title="Recent activity" empty={recentActivity.length === 0}>
        {recentActivity.map((log) => (
          <CompactLogRow key={log.id} log={log} entities={entities} />
        ))}
      </CompactSection>

      <CompactSection title="Upcoming follow-ups" empty={upcomingFollowUps.length === 0}>
        {upcomingFollowUps.map((log) => (
          <CompactLogRow key={log.id} log={log} entities={entities} />
        ))}
      </CompactSection>

      <CompactSection title="Upcoming events" empty={upcomingEvents.length === 0}>
        {upcomingEvents.map((log) => (
          <CompactLogRow key={log.id} log={log} entities={entities} />
        ))}
      </CompactSection>

      <CompactSection title="Recently added entities" empty={recentEntities.length === 0}>
        {recentEntities.map((entity) => (
          <CompactEntityRow
            key={entity.id}
            entity={entity}
            meta={ENTITY_TYPE_LABELS[entity.type]}
          />
        ))}
      </CompactSection>

      {!hasContent && <EmptyState message="No journal entries yet. Start with who you talked to." />}
    </>
  );
}
