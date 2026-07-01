import Link from "next/link";
import { hasHealthSecretUnlock } from "@/lib/auth/cookies";
import { BEHAVIOR_LABELS, RECORD_TYPE_LABELS } from "@/lib/health-vault/labels";
import { getEvidence, getPerson, getRecord } from "@/lib/health-vault/server-storage";
import { EvidenceCard } from "@/app/health/components/Cards";
import { Button, Card, EmptyState, formatDate, PageHeader, StatusBadge, TypeBadge } from "@/app/health/components/ui";

export default async function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const includeSecret = await hasHealthSecretUnlock();
  const record = await getRecord(id, includeSecret);

  if (!record) {
    return (
      <>
        <PageHeader title="No encontrado" backHref="/health/records" />
        <EmptyState message="Registro no encontrado o requiere desbloqueo secreto." />
      </>
    );
  }

  const evidence = await getEvidence(id, includeSecret);
  const people = (
    await Promise.all(record.personIds.map((pid) => getPerson(pid)))
  ).filter(Boolean);

  return (
    <>
      <PageHeader title={record.title} backHref="/health/records" />
      <Card className="mb-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <TypeBadge type={record.type} />
          <StatusBadge status={record.status} />
          {record.secret && (
            <span className="rounded-full bg-violet-600/20 px-2.5 py-0.5 text-xs font-medium text-violet-300">
              Secreto
            </span>
          )}
          {record.behaviorKind && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${record.behaviorKind === "correcto" ? "bg-emerald-600/20 text-emerald-400" : "bg-red-600/20 text-red-400"}`}
            >
              {BEHAVIOR_LABELS[record.behaviorKind]}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500">
          {RECORD_TYPE_LABELS[record.type]} · {formatDate(record.date)}
        </p>
        <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">{record.description}</p>
        {record.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {record.tags.map((t) => (
              <span key={t} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                #{t}
              </span>
            ))}
          </div>
        )}
        {people.length > 0 && (
          <div className="mt-4 border-t border-zinc-800 pt-3">
            <p className="mb-2 text-xs font-medium uppercase text-zinc-500">Personas</p>
            {people.map(
              (p) =>
                p && (
                  <p key={p.id} className="text-sm text-zinc-300">
                    {p.name} · {p.relationship}
                  </p>
                )
            )}
          </div>
        )}
      </Card>

      <Button href={`/health/records/${id}/evidence/new`} fullWidth className="mb-6">
        + Agregar evidencia
      </Button>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Evidencias ({evidence.length})
        </h2>
        {evidence.length === 0 ? (
          <EmptyState message="Sin evidencias. Agrega correos, mensajes o archivos." />
        ) : (
          <div className="space-y-3">
            {evidence.map((e) => (
              <div key={e.id}>
                <EvidenceCard item={e} />
                {e.attachmentName && (
                  <Link
                    href={`/api/health-vault/files/${e.id}`}
                    className="mt-1 inline-block text-xs text-teal-500 underline"
                  >
                    Descargar adjunto
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
