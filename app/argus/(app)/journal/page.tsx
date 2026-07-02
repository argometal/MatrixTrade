import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { LogCard } from "@/app/argus/components/Cards";
import { PrivatePanel } from "@/app/argus/components/PrivatePanel";
import { Button, EmptyState, PageHeader } from "@/app/argus/components/ui";
import { getEntities, getLogsByKind } from "@/lib/argus/server-storage";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ private_error?: string }>;
}) {
  const { private_error } = await searchParams;
  const includePrivate = await hasArgusPrivateUnlock();
  const entities = await getEntities();
  const recentLogs = await getLogsByKind("log", includePrivate, 5);
  const recentEvents = await getLogsByKind("event", includePrivate, 5);
  const followUps = await getLogsByKind("follow_up", includePrivate, 5);

  return (
    <>
      <PageHeader title="Journal" subtitle="Source of truth — logs, events, follow-ups" />
      <PrivatePanel privateError={Boolean(private_error)} />

      <Button href="/argus/new" fullWidth className="mb-8">
        + New
      </Button>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Recent logs</h2>
        {recentLogs.length === 0 ? (
          <EmptyState message="No logs yet." />
        ) : (
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <LogCard key={log.id} log={log} entities={entities} />
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Events</h2>
        {recentEvents.length === 0 ? (
          <EmptyState message="No events yet." />
        ) : (
          <div className="space-y-3">
            {recentEvents.map((log) => (
              <LogCard key={log.id} log={log} entities={entities} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Follow-ups</h2>
        {followUps.length === 0 ? (
          <EmptyState message="No follow-ups yet." />
        ) : (
          <div className="space-y-3">
            {followUps.map((log) => (
              <LogCard key={log.id} log={log} entities={entities} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
