"use client";

import { useState } from "react";
import { RecordCard } from "@/app/components/Cards";
import { Button, EmptyState, inputClass, PageHeader } from "@/app/components/ui";
import { useVault } from "@/lib/health-vault/useVault";

export default function RecordsPage() {
  const { ready, getRecords, searchRecords, getEvidence } = useVault();
  const [query, setQuery] = useState("");

  if (!ready) return <p className="text-center text-zinc-500">Cargando...</p>;

  const records = query ? searchRecords(query) : getRecords();

  return (
    <>
      <PageHeader title="Registros" subtitle="Quejas, incidentes, comportamientos y correos" />
      <input type="search" placeholder="Buscar registros..." value={query} onChange={(e) => setQuery(e.target.value)} className={`${inputClass} mb-4`} />
      <Button href="/records/new" fullWidth className="mb-4">+ Nuevo registro</Button>
      {records.length === 0 ? (
        <EmptyState message={query ? "Sin resultados." : "Sin registros aún."} />
      ) : (
        <div className="space-y-3">
          {records.map((r) => <RecordCard key={r.id} record={r} evidenceCount={getEvidence(r.id).length} />)}
        </div>
      )}
    </>
  );
}
