import { hasHealthSecretUnlock } from "@/lib/auth/cookies";
import { RecordCard } from "@/app/health/components/Cards";
import { Button, EmptyState, PageHeader } from "@/app/health/components/ui";
import { getRecords, readVault, evidenceCountForRecord } from "@/lib/health-vault/server-storage";

export default async function RecordsPage() {
  const includeSecret = await hasHealthSecretUnlock();
  const records = await getRecords(includeSecret);
  const vault = await readVault();

  return (
    <>
      <PageHeader title="Registros" subtitle={`${records.length} en total`} />
      <Button href="/health" fullWidth className="mb-6">
        + Nuevo en inbox
      </Button>
      {records.length === 0 ? (
        <EmptyState message="Sin registros." />
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
