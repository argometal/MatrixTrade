import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { EntryCard } from "@/app/argus/components/Cards";
import { Button, EmptyState, PageHeader } from "@/app/argus/components/ui";
import { evidenceCountForEntry, getEntries, readArgus } from "@/lib/argus/server-storage";

export default async function EntriesPage() {
  const includePrivate = await hasArgusPrivateUnlock();
  const entries = await getEntries(includePrivate);
  const data = await readArgus();

  return (
    <>
      <PageHeader title="Entries" subtitle="Chronological professional history" />
      <Button href="/argus/entries/new" fullWidth className="mb-6">
        + New entry
      </Button>
      {entries.length === 0 ? (
        <EmptyState message="No entries yet." />
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <EntryCard key={e.id} entry={e} evidenceCount={evidenceCountForEntry(data, e.id)} />
          ))}
        </div>
      )}
    </>
  );
}
