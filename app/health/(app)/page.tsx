import { hasHealthSecretUnlock } from "@/lib/auth/cookies";
import { EvidenceCard, RecordCard } from "@/app/health/components/Cards";
import { SecretPanel } from "@/app/health/components/SecretPanel";
import { Button, EmptyState, PageHeader, StatCard } from "@/app/health/components/ui";
import { loadVaultWithCounts } from "@/lib/health-vault/server-storage";

export default async function HealthHomePage({
  searchParams,
}: {
  searchParams: Promise<{ secret_error?: string }>;
}) {
  const { secret_error } = await searchParams;
  const includeSecret = await hasHealthSecretUnlock();
  const { stats, recentRecords, recentEvidence, evidenceCounts } =
    await loadVaultWithCounts(includeSecret);

  return (
    <>
      <PageHeader title="Home" />
      <SecretPanel secretError={Boolean(secret_error)} />

      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard label="Records" value={stats.totalRecords} accent="teal" />
        <StatCard label="Evidence" value={stats.totalEvidence} accent="teal" />
        <StatCard label="People" value={stats.totalPeople} />
        <StatCard label="Open" value={stats.openRecords} accent="amber" />
      </div>

      {stats.secretRecords > 0 && !includeSecret && (
        <p className="mb-4 text-xs text-violet-400">
          {stats.secretRecords} secret record(s) hidden. Unlock above.
        </p>
      )}

      <div className="mb-6 flex flex-col gap-3">
        <Button href="/health/records/new" fullWidth>
          + New record
        </Button>
        <Button href="/health/people/new" variant="secondary" fullWidth>
          + New person
        </Button>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Recent records</h2>
        {recentRecords.length === 0 ? (
          <EmptyState message="No records yet." />
        ) : (
          <div className="space-y-3">
            {recentRecords.map((r) => (
              <RecordCard key={r.id} record={r} evidenceCount={evidenceCounts.get(r.id) ?? 0} />
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
