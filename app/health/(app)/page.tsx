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
      <PageHeader title="Inicio" subtitle="Tu bitácora laboral con evidencias" />
      <SecretPanel secretError={Boolean(secret_error)} />

      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard label="Registros" value={stats.totalRecords} accent="teal" />
        <StatCard label="Evidencias" value={stats.totalEvidence} accent="teal" />
        <StatCard label="Personas" value={stats.totalPeople} />
        <StatCard label="Abiertos" value={stats.openRecords} accent="amber" />
      </div>

      {stats.secretRecords > 0 && !includeSecret && (
        <p className="mb-4 text-xs text-violet-400">
          {stats.secretRecords} registro(s) secreto(s) oculto(s). Desbloquea arriba.
        </p>
      )}

      <div className="mb-6 flex flex-col gap-3">
        <Button href="/health/records/new" fullWidth>
          + Nuevo registro
        </Button>
        <Button href="/health/people/new" variant="secondary" fullWidth>
          + Nueva persona
        </Button>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Registros recientes</h2>
        {recentRecords.length === 0 ? (
          <EmptyState message="Sin registros. Documenta el primer incidente o queja." />
        ) : (
          <div className="space-y-3">
            {recentRecords.map((r) => (
              <RecordCard key={r.id} record={r} evidenceCount={evidenceCounts.get(r.id) ?? 0} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Evidencias recientes</h2>
        {recentEvidence.length === 0 ? (
          <EmptyState message="Sin evidencias aún." />
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
