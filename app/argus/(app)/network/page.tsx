import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { EntityCreateForm } from "@/app/argus/components/EntityCreateForm";
import { NetworkHomeSections } from "@/app/argus/components/NetworkEntityCard";
import { EmptyState, inputClass, PageHeader } from "@/app/argus/components/ui";
import {
  buildAllEntityIntelligence,
  buildNetworkHomeSections,
} from "@/lib/argus/network-intelligence";
import { readArgus } from "@/lib/argus/server-storage";
import { REFERENCES, NETWORK, ENTITY_CREATE } from "@/lib/argus/ux-copy";

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string; errorLayer?: string; errorMsg?: string }>;
}) {
  const { q, error, errorLayer, errorMsg } = await searchParams;
  const includePrivate = await hasArgusPrivateUnlock();
  const data = await readArgus();
  const intelligence = buildAllEntityIntelligence(data, includePrivate, q);
  const sections = buildNetworkHomeSections(intelligence);

  const hasEntities = data.entities.length > 0;

  return (
    <>
      <PageHeader title={NETWORK.title} subtitle={NETWORK.subtitle} backHref="/argus/journal" />

      <EntityCreateForm error={error} errorLayer={errorLayer} errorMsg={errorMsg} />

      <form action="/argus/network" method="get" className="mb-6 flex gap-2">
        <input name="q" defaultValue={q ?? ""} placeholder={NETWORK.searchPlaceholder} className={inputClass} />
        <button type="submit" className="shrink-0 rounded-xl bg-zinc-700 px-4 py-2 text-sm text-white">
          Search
        </button>
      </form>

      {!hasEntities ? (
        <EmptyState message={`${REFERENCES.emptyNetwork} ${ENTITY_CREATE.emptySearch}`} />
      ) : (
        <NetworkHomeSections sections={sections} />
      )}
    </>
  );
}
