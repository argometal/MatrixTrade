"use client";

import { EvidenceCard, RecordCard } from "@/app/components/Cards";
import { Button, EmptyState, PageHeader, StatCard } from "@/app/components/ui";
import { useVault } from "@/lib/health-vault/useVault";

export default function HomePage() {
  const { ready, getStats, getRecentRecords, getRecentEvidence, getEvidence } = useVault();

  if (!ready) return <p className="text-center text-zinc-500">Cargando...</p>;

  const stats = getStats();
  const recentRecords = getRecentRecords(3);
  const recentEvidence = getRecentEvidence(3);

  return (
    <>
      <PageHeader title="Inicio" subtitle="Tu bitácora laboral con evidencias" />

      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard label="Registros" value={stats.totalRecords} accent="teal" />
        <StatCard label="Evidencias" value={stats.totalEvidence} accent="teal" />
        <StatCard label="Personas" value={stats.totalPeople} />
        <StatCard label="Abiertos" value={stats.openRecords} accent="amber" />
      </div>

      <div className="mb-6 flex flex-col gap-3">
        <Button href="/records/new" fullWidth>+ Nuevo registro</Button>
        <Button href="/people/new" variant="secondary" fullWidth>+ Nueva persona</Button>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Registros recientes</h2>
        {recentRecords.length === 0 ? (
          <EmptyState message="Sin registros. Documenta el primer incidente o queja." />
        ) : (
          <div className="space-y-3">
            {recentRecords.map((r) => (
              <RecordCard key={r.id} record={r} evidenceCount={getEvidence(r.id).length} />
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
            {recentEvidence.map((e) => <EvidenceCard key={e.id} item={e} />)}
          </div>
        )}
      </section>
    </>
  );
}
