import Link from "next/link";
import { Card, formatDate, StatusBadge, TypeBadge } from "./ui";
import type { Evidence, Person, WorkRecord } from "@/lib/health-vault/types";
import { BEHAVIOR_LABELS, EVIDENCE_TYPE_LABELS } from "@/lib/health-vault/labels";

export function RecordCard({ record, evidenceCount }: { record: WorkRecord; evidenceCount?: number }) {
  return (
    <Link href={`/health/records/${record.id}`}>
      <Card className="transition hover:border-zinc-700">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap gap-2">
              <TypeBadge type={record.type} />
              <StatusBadge status={record.status} />
              {record.secret && (
                <span className="rounded-full bg-violet-600/20 px-2.5 py-0.5 text-xs font-medium text-violet-300">
                  Secret
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
            <h3 className="font-semibold text-zinc-50">{record.title}</h3>
            <p className="mt-1 text-xs text-zinc-500">{formatDate(record.date)}</p>
            <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{record.description}</p>
            {evidenceCount !== undefined && (
              <p className="mt-2 text-xs text-teal-500">
                {evidenceCount} evidence item{evidenceCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <span className="text-zinc-600">›</span>
        </div>
      </Card>
    </Link>
  );
}

export function EvidenceCard({ item }: { item: Evidence }) {
  return (
    <Card>
      <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
        {EVIDENCE_TYPE_LABELS[item.type]}
      </span>
      <h4 className="mt-2 font-medium text-zinc-100">{item.title}</h4>
      <p className="text-xs text-zinc-500">
        {formatDate(item.date)} · {item.source}
      </p>
      {item.attachmentName && (
        <p className="mt-1 text-xs text-teal-500">Attachment: {item.attachmentName}</p>
      )}
      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-zinc-400">{item.content}</p>
    </Card>
  );
}

export function PersonCard({ person, recordCount }: { person: Person; recordCount?: number }) {
  return (
    <Link href={`/health/people/${person.id}`}>
      <Card className="transition hover:border-zinc-700">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-zinc-50">{person.name}</h3>
            <p className="text-sm text-zinc-400">
              {person.role} · {person.department}
            </p>
            <span className="mt-2 inline-block rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">
              {person.relationship}
            </span>
            {recordCount !== undefined && (
              <p className="mt-2 text-xs text-zinc-500">
                {recordCount} record{recordCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <span className="text-zinc-600">›</span>
        </div>
      </Card>
    </Link>
  );
}
