import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { NetworkHomeSections } from "@/app/argus/components/NetworkEntityCard";
import { EmptyState, inputClass, PageHeader } from "@/app/argus/components/ui";
import {
  buildAllEntityIntelligence,
  buildNetworkHomeSections,
} from "@/lib/argus/network-intelligence";
import { readArgus } from "@/lib/argus/server-storage";

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const includePrivate = await hasArgusPrivateUnlock();
  const data = await readArgus();
  const intelligence = buildAllEntityIntelligence(data, includePrivate, q);
  const sections = buildNetworkHomeSections(intelligence);

  const hasEntities = data.entities.length > 0;

  return (
    <>
      <PageHeader
        title="Network"
        subtitle="Relationship intelligence — who deserves your attention"
        backHref="/argus/journal"
      />

      <form action="/argus/network" method="get" className="mb-6 flex gap-2">
        <input name="q" defaultValue={q ?? ""} placeholder="Search entities..." className={inputClass} />
        <button type="submit" className="shrink-0 rounded-xl bg-zinc-700 px-4 py-2 text-sm text-white">
          Search
        </button>
      </form>

      {!hasEntities ? (
        <EmptyState message="No entities yet. They appear when you link evidence and logs." />
      ) : (
        <NetworkHomeSections sections={sections} />
      )}
    </>
  );
}
