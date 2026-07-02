import Link from "next/link";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { LogCard } from "@/app/argus/components/Cards";
import { EmptyState, formatDate, inputClass, PageHeader } from "@/app/argus/components/ui";
import { ENTITY_TYPE_LABELS } from "@/lib/argus/labels";
import {
  buildEntityNetworkViews,
  getGlobalTopics,
  getUpcomingFollowUps,
} from "@/lib/argus/network";
import { getEntities, readArgus } from "@/lib/argus/server-storage";

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const includePrivate = await hasArgusPrivateUnlock();
  const data = await readArgus();
  const entities = await getEntities();
  const views = buildEntityNetworkViews(data, includePrivate, q);
  const topics = getGlobalTopics(data, includePrivate);
  const followUps = getUpcomingFollowUps(data, includePrivate, 8);

  return (
    <>
      <PageHeader title="Network" subtitle="Relationships read from Journal — never duplicated" backHref="/argus/journal" />

      <form action="/argus/network" method="get" className="mb-6 flex gap-2">
        <input name="q" defaultValue={q ?? ""} placeholder="Search entities..." className={inputClass} />
        <button type="submit" className="shrink-0 rounded-xl bg-zinc-700 px-4 py-2 text-sm text-white">
          Search
        </button>
      </form>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Entities</h2>
        {views.length === 0 ? (
          <EmptyState message="No entities yet. Create one when adding a Journal entry." />
        ) : (
          <div className="space-y-3">
            {views.map(({ entity, lastInteraction, nextTouch, topics: entityTopics, logCount, openFollowUps }) => (
              <Link key={entity.id} href={`/argus/network/${entity.id}`}>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-zinc-700">
                  <p className="font-semibold text-zinc-50">{entity.name}</p>
                  <p className="text-xs text-zinc-500">{ENTITY_TYPE_LABELS[entity.type]}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-400">
                    {lastInteraction && <span>Last: {formatDate(lastInteraction)}</span>}
                    {nextTouch && <span className="text-amber-400">Next touch: {formatDate(nextTouch)}</span>}
                    <span>{logCount} journal item{logCount !== 1 ? "s" : ""}</span>
                    {openFollowUps > 0 && <span>{openFollowUps} open follow-up{openFollowUps !== 1 ? "s" : ""}</span>}
                  </div>
                  {entityTopics.length > 0 && (
                    <p className="mt-2 text-xs text-teal-500">{entityTopics.join(" · ")}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Topics</h2>
        {topics.length === 0 ? (
          <EmptyState message="Topics appear when you tag journal entries." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <Link
                key={t}
                href={`/argus/search?q=${encodeURIComponent(t)}`}
                className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
              >
                #{t}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Follow-up list</h2>
        {followUps.length === 0 ? (
          <EmptyState message="No follow-ups scheduled." />
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
