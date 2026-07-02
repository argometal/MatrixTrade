import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { ContactCard, EntryCard, EvidenceCard } from "@/app/argus/components/Cards";
import { PrivatePanel } from "@/app/argus/components/PrivatePanel";
import { Button, EmptyState, PageHeader, StatCard } from "@/app/argus/components/ui";
import { loadArgusWithCounts } from "@/lib/argus/server-storage";

export default async function ArgusHomePage({
  searchParams,
}: {
  searchParams: Promise<{ private_error?: string }>;
}) {
  const { private_error } = await searchParams;
  const includePrivate = await hasArgusPrivateUnlock();
  const { stats, recentEntries, recentEvidence, evidenceCounts } =
    await loadArgusWithCounts(includePrivate);

  return (
    <>
      <PageHeader title="ARGUS" subtitle="Professional journal — facts first, evidence when possible" />
      <PrivatePanel privateError={Boolean(private_error)} />

      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard label="Entries" value={stats.totalEntries} accent="teal" />
        <StatCard label="Evidence" value={stats.totalEvidence} accent="teal" />
        <StatCard label="Contacts" value={stats.totalContacts} />
        <StatCard label="Active" value={stats.openEntries} accent="amber" />
      </div>

      {stats.privateEntries > 0 && !includePrivate && (
        <p className="mb-4 text-xs text-violet-400">
          {stats.privateEntries} private entr{stats.privateEntries !== 1 ? "ies" : "y"} hidden. Unlock above.
        </p>
      )}

      <div className="mb-6 flex flex-col gap-3">
        <Button href="/argus/entries/new" fullWidth>
          + New entry
        </Button>
        <Button href="/argus/contacts/new" variant="secondary" fullWidth>
          + New contact
        </Button>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Recent entries</h2>
        {recentEntries.length === 0 ? (
          <EmptyState message="No entries yet. Capture a meeting, note, or observation." />
        ) : (
          <div className="space-y-3">
            {recentEntries.map((e) => (
              <EntryCard key={e.id} entry={e} evidenceCount={evidenceCounts.get(e.id) ?? 0} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Recent evidence</h2>
        {recentEvidence.length === 0 ? (
          <EmptyState message="No evidence yet." />
        ) : (
          <div className="space-y-3">
            {recentEvidence.map((e) => (
              <EvidenceCard key={e.id} item={e} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
