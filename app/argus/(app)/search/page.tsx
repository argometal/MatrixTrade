import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { LogCard } from "@/app/argus/components/Cards";
import { EmptyState, inputClass, PageHeader } from "@/app/argus/components/ui";
import { entityKindLabel } from "@/lib/argus/reference-types";
import { REFERENCES, SEARCH } from "@/lib/argus/ux-copy";
import { getEntities, searchEntities, searchLogs } from "@/lib/argus/server-storage";
import Link from "next/link";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const includePrivate = await hasArgusPrivateUnlock();
  const entities = query ? await searchEntities(query) : await getEntities();
  const logs = query ? await searchLogs(query, includePrivate) : [];

  return (
    <>
      <PageHeader title={SEARCH.title} subtitle={SEARCH.subtitle} backHref="/argus/journal" />
      <form action="/argus/search" method="get" className="mb-6 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder={REFERENCES.search + "…"}
          className={inputClass}
        />
        <button type="submit" className="shrink-0 rounded-xl bg-zinc-700 px-4 py-2 text-sm text-white">
          Go
        </button>
      </form>

      {query && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Notes</h2>
          {logs.length === 0 ? (
            <EmptyState message="No notes match your search." />
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <LogCard key={log.id} log={log} entities={entities} />
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">{REFERENCES.search}</h2>
        {entities.length === 0 ? (
          <EmptyState message={`${REFERENCES.emptyNetwork} ${REFERENCES.emptyNetworkHint}`} />
        ) : (
          <div className="space-y-2">
            {entities.map((e) => (
              <Link key={e.id} href={`/argus/network/${e.id}`}>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 transition hover:border-zinc-700">
                  <p className="font-medium text-zinc-100">{e.name}</p>
                  <p className="text-xs text-zinc-500">{entityKindLabel(e)}</p>
                  {e.notes && <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{e.notes}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
