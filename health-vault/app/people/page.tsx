"use client";

import { useState } from "react";
import { PersonCard } from "@/app/components/Cards";
import { Button, EmptyState, inputClass, PageHeader } from "@/app/components/ui";
import { useVault } from "@/lib/health-vault/useVault";

export default function PeoplePage() {
  const { ready, getPeople, searchPeople, getRecordsForPerson } = useVault();
  const [query, setQuery] = useState("");

  if (!ready) return <p className="text-center text-zinc-500">Cargando...</p>;

  const people = query ? searchPeople(query) : getPeople();

  return (
    <>
      <PageHeader title="Personas" subtitle="Jefes, compañeros, RH, testigos" />
      <input type="search" placeholder="Buscar personas..." value={query} onChange={(e) => setQuery(e.target.value)} className={`${inputClass} mb-4`} />
      <Button href="/people/new" fullWidth className="mb-4">+ Nueva persona</Button>
      {people.length === 0 ? (
        <EmptyState message={query ? "Sin resultados." : "Sin personas registradas."} />
      ) : (
        <div className="space-y-3">
          {people.map((p) => <PersonCard key={p.id} person={p} recordCount={getRecordsForPerson(p.id).length} />)}
        </div>
      )}
    </>
  );
}
