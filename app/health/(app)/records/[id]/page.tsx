import Link from "next/link";
import { hasHealthSecretUnlock } from "@/lib/auth/cookies";
import { RECORD_TYPE_LABELS } from "@/lib/health-vault/labels";
import { getEvidence, getPerson, getRecord } from "@/lib/health-vault/server-storage";
import { Card, EmptyState, formatDate, PageHeader, TypeBadge } from "@/app/health/components/ui";

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
  const person = record.personIds[0] ? await getPerson(record.personIds[0]) : undefined;

  return (
    <>
      <PageHeader title={record.title} backHref="/health/records" />
      <Card className="mb-4">
        <div className="mb-2 flex flex-wrap gap-2">
          <TypeBadge type={record.type} />
          {record.secret && (
            <span className="rounded-full bg-violet-600/20 px-2.5 py-0.5 text-xs font-medium text-violet-300">
              Secreto
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500">
          {formatDate(record.date)}
          {person ? ` · ${person.name}` : ""}
        </p>
        <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">{record.description}</p>
      </Card>

      {evidence.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Adjuntos</h2>
          <div className="space-y-2">
            {evidence.map((e) => (
              <div key={e.id} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                {e.attachmentName ? (
                  <Link href={`/api/health-vault/files/${e.id}`} className="text-sm text-teal-400 underline">
                    {e.attachmentName}
                  </Link>
                ) : (
                  <p className="whitespace-pre-wrap text-sm text-zinc-400">{e.content}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
