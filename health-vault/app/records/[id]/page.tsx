"use client";

import { useParams } from "next/navigation";
import { EvidenceCard } from "@/app/components/Cards";
import { BEHAVIOR_LABELS, RECORD_TYPE_LABELS } from "@/lib/health-vault/labels";
import { Button, Card, EmptyState, formatDate, PageHeader, StatusBadge, TypeBadge } from "@/app/components/ui";
import { useVault } from "@/lib/health-vault/useVault";

export default function RecordDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { ready, getRecord, getEvidence, getPerson } = useVault();

  if (!ready) return <p className="text-center text-zinc-500">Cargando...</p>;

  const record = getRecord(id);
  if (!record) {
    return (
      <>
        <PageHeader title="No encontrado" backHref="/records" />
        <EmptyState message="Registro no encontrado." />
      </>
    );
  }

  const evidence = getEvidence(id);
  const people = record.personIds.map((pid) => getPerson(pid)).filter(Boolean);

  return (
    <>
      <PageHeader title={record.title} backHref="/records" />
      <Card className="mb-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <TypeBadge type={record.type} />
          <StatusBadge status={record.status} />
          {record.behaviorKind && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${record.behaviorKind === "correcto" ? "bg-emerald-600/20 text-emerald-400" : "bg-red-600/20 text-red-400"}`}>
              {BEHAVIOR_LABELS[record.behaviorKind]}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500">{RECORD_TYPE_LABELS[record.type]} · {formatDate(record.date)}</p>
        <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">{record.description}</p>
        {record.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {record.tags.map((t) => <span key={t} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">#{t}</span>)}
          </div>
        )}
        {people.length > 0 && (
          <div className="mt-4 border-t border-zinc-800 pt-3">
            <p className="mb-2 text-xs font-medium uppercase text-zinc-500">Personas</p>
            {people.map((p) => p && <p key={p.id} className="text-sm text-zinc-300">{p.name} · {p.relationship}</p>)}
          </div>
        )}
      </Card>

      <Button href={`/records/${id}/evidence/new`} fullWidth className="mb-6">+ Agregar evidencia</Button>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Evidencias ({evidence.length})
        </h2>
        {evidence.length === 0 ? (
          <EmptyState message="Sin evidencias. Agrega correos, mensajes o declaraciones de testigos." />
        ) : (
          <div className="space-y-3">
            {evidence.map((e) => <EvidenceCard key={e.id} item={e} />)}
          </div>
        )}
      </section>
    </>
  );
}
