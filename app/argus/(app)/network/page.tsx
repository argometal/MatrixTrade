import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { NetworkHomeSections } from "@/app/argus/components/NetworkEntityCard";
import { EmptyState, inputClass, PageHeader } from "@/app/argus/components/ui";
import {
  buildAllEntityIntelligence,
  buildNetworkHomeSections,
} from "@/lib/argus/network-intelligence";
import { readArgus } from "@/lib/argus/server-storage";
import { CONTACTS, NETWORK } from "@/lib/argus/ux-copy";
import Link from "next/link";

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
      <PageHeader title={NETWORK.title} subtitle={NETWORK.subtitle} backHref="/argus/journal" />

      <form action="/argus/network" method="get" className="mb-6 flex gap-2">
        <input name="q" defaultValue={q ?? ""} placeholder={NETWORK.searchPlaceholder} className={inputClass} />
        <button type="submit" className="shrink-0 rounded-xl bg-zinc-700 px-4 py-2 text-sm text-white">
          Search
        </button>
      </form>

      {!hasEntities ? (
        <EmptyState
          message={`${CONTACTS.emptyNetwork} ${CONTACTS.emptyNetworkHint}`}
          action={
            <Link
              href="/argus/journal?capture=1&panel=entity&createEntity=person"
              className="text-sm font-medium text-teal-500 underline hover:text-teal-400"
            >
              {CONTACTS.createFirst}
            </Link>
          }
        />
      ) : (
        <NetworkHomeSections sections={sections} />
      )}
    </>
  );
}
