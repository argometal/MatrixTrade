import Link from "next/link";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { LogCard } from "@/app/argus/components/Cards";
import { Card, EmptyState, formatDate, PageHeader } from "@/app/argus/components/ui";
import { ENTITY_TYPE_LABELS } from "@/lib/argus/labels";
import { getEntityHistory } from "@/lib/argus/network";
import { getEntities, getEntity, readArgus } from "@/lib/argus/server-storage";
import { buildEntityNetworkViews } from "@/lib/argus/network";

export default async function EntityNetworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const includePrivate = await hasArgusPrivateUnlock();
  const entity = await getEntity(id);

  if (!entity) {
    return (
      <>
        <PageHeader title="Not found" backHref="/argus/network" />
        <EmptyState message="Entity not found." />
      </>
    );
  }

  const data = await readArgus();
  const entities = await getEntities();
  const history = getEntityHistory(data, id, includePrivate);
  const [view] = buildEntityNetworkViews(data, includePrivate).filter((v) => v.entity.id === id);

  return (
    <>
      <PageHeader title={entity.name} backHref="/argus/network" />
      <Card className="mb-6">
        <p className="text-sm text-zinc-400">{ENTITY_TYPE_LABELS[entity.type]}</p>
        {entity.notes && <p className="mt-2 text-sm text-zinc-300">{entity.notes}</p>}
        {view && (
          <div className="mt-4 flex flex-wrap gap-3 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
            {view.lastInteraction && <span>Last interaction: {formatDate(view.lastInteraction)}</span>}
            {view.nextTouch && <span className="text-amber-400">Next touch: {formatDate(view.nextTouch)}</span>}
          </div>
        )}
        {view && view.topics.length > 0 && (
          <p className="mt-2 text-xs text-teal-500">Topics: {view.topics.join(" · ")}</p>
        )}
      </Card>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Relationship history</h2>
      {history.length === 0 ? (
        <EmptyState message="No journal items linked yet." />
      ) : (
        <div className="space-y-3">
          {history.map((log) => (
            <LogCard key={log.id} log={log} entities={entities} />
          ))}
        </div>
      )}

      <p className="mt-6 text-center">
        <Link href={`/argus/new?q=${encodeURIComponent(entity.name)}`} className="text-sm text-teal-500 underline">
          + New journal entry for {entity.name}
        </Link>
      </p>
    </>
  );
}
