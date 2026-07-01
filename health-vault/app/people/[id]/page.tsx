"use client";

import { useParams } from "next/navigation";
import { RecordCard } from "@/app/components/Cards";
import { Card, EmptyState, PageHeader } from "@/app/components/ui";
import { useVault } from "@/lib/health-vault/useVault";

export default function PersonDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { ready, getPerson, getRecordsForPerson } = useVault();

  if (!ready) return <p className="text-center text-zinc-500">Cargando...</p>;

  const person = getPerson(id);
  if (!person) {
    return (
      <>
        <PageHeader title="No encontrado" backHref="/people" />
        <EmptyState message="Persona no encontrada." />
      </>
    );
  }

  const records = getRecordsForPerson(id);

  return (
    <>
      <PageHeader title={person.name} backHref="/people" />
      <Card className="mb-6">
        <p className="text-sm text-zinc-400">{person.role} · {person.department}</p>
        <span className="mt-2 inline-block rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">{person.relationship}</span>
        {person.email && <p className="mt-3 text-sm"><a href={`mailto:${person.email}`} className="text-teal-400">{person.email}</a></p>}
        {person.phone && <p className="mt-1 text-sm"><a href={`tel:${person.phone}`} className="text-teal-400">{person.phone}</a></p>}
        {person.notes && <p className="mt-3 text-sm text-zinc-300">{person.notes}</p>}
      </Card>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Registros vinculados ({records.length})
        </h2>
        {records.length === 0 ? (
          <EmptyState message="Sin registros vinculados a esta persona." />
        ) : (
          <div className="space-y-3">
            {records.map((r) => <RecordCard key={r.id} record={r} />)}
          </div>
        )}
      </section>
    </>
  );
}
