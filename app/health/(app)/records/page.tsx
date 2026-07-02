import { hasHealthSecretUnlock } from "@/lib/auth/cookies";
import { RecordCard } from "@/app/health/components/Cards";
import { Button, EmptyState, PageHeader } from "@/app/health/components/ui";
import { getRecords, evidenceCountForRecord, readVault } from "@/lib/health-vault/server-storage";

export default async function RecordsPage() {
  const includeSecret = await hasHealthSecretUnlock();
  const records = await getRecords(includeSecret);
  const vault = await readVault();

  return (
    <>
      <PageHeader title="Records" subtitle="Newest first" />
      <Button href="/health/records/new" fullWidth className="mb-6">
        + New record
      </Button>
      {records.length === 0 ? (
        <EmptyState message="No records." />
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <RecordCard key={r.id} record={r} evidenceCount={evidenceCountForRecord(vault, r.id)} />
          ))}
        </div>
      )}
    </>
  );
}
