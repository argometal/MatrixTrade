import { hasHealthSecretUnlock } from "@/lib/auth/cookies";
import { RecordCard } from "@/app/health/components/Cards";
import { IntakeForm } from "@/app/health/components/IntakeForm";
import { SecretPanel } from "@/app/health/components/SecretPanel";
import { EmptyState, PageHeader } from "@/app/health/components/ui";
import { getRecords, readVault, evidenceCountForRecord } from "@/lib/health-vault/server-storage";

export default async function HealthHomePage({
  searchParams,
}: {
  searchParams: Promise<{ secret_error?: string; saved?: string; error?: string }>;
}) {
  const { secret_error, saved, error } = await searchParams;
  const includeSecret = await hasHealthSecretUnlock();
  const records = await getRecords(includeSecret).then((r) => r.slice(0, 10));
  const vault = await readVault();

  return (
    <>
      <PageHeader title="Inbox" subtitle="Registra en menos de un minuto" />
      <SecretPanel secretError={Boolean(secret_error)} />

      {saved && (
        <p className="mb-3 rounded-xl border border-teal-800 bg-teal-950/40 px-3 py-2 text-sm text-teal-300">
          Guardado.
        </p>
      )}
      {error && (
        <p className="mb-3 rounded-xl border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          Escribe qué pasó antes de guardar.
        </p>
      )}

      <IntakeForm />

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Recientes</h2>
        {records.length === 0 ? (
          <EmptyState message="Nada aún. Arriba escribes y guardas." />
        ) : (
          <div className="space-y-3">
            {records.map((r) => (
              <RecordCard key={r.id} record={r} evidenceCount={evidenceCountForRecord(vault, r.id)} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
