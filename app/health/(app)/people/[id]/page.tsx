import Link from "next/link";
import { hasHealthSecretUnlock } from "@/lib/auth/cookies";
import { getPerson, getRecordsForPerson } from "@/lib/health-vault/server-storage";
import { RecordCard } from "@/app/health/components/Cards";
import { Card, EmptyState, PageHeader } from "@/app/health/components/ui";
import { readVault, evidenceCountForRecord } from "@/lib/health-vault/server-storage";

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const includeSecret = await hasHealthSecretUnlock();
  const person = await getPerson(id);

  if (!person) {
    return (
      <>
        <PageHeader title="No encontrado" backHref="/health/people" />
        <EmptyState message="Persona no encontrada." />
      </>
    );
  }

  const records = await getRecordsForPerson(id, includeSecret);
  const vault = await readVault();

  return (
    <>
      <PageHeader title={person.name} backHref="/health/people" />
      <Card className="mb-6">
        <p className="text-sm text-zinc-400">
          {person.role} · {person.department}
        </p>
        <p className="mt-2 text-sm text-zinc-300">{person.relationship}</p>
        {person.email && <p className="mt-2 text-sm text-zinc-400">{person.email}</p>}
        {person.phone && <p className="text-sm text-zinc-400">{person.phone}</p>}
        {person.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">{person.notes}</p>}
      </Card>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Registros vinculados</h2>
      {records.length === 0 ? (
        <EmptyState message="Sin registros vinculados." />
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
