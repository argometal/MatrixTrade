import Link from "next/link";
import { Card, formatDate, TypeBadge } from "./ui";
import type { Person, WorkRecord } from "@/lib/health-vault/types";

export function RecordCard({ record, evidenceCount }: { record: WorkRecord; evidenceCount?: number }) {
  return (
    <Link href={`/health/records/${record.id}`}>
      <Card className="transition hover:border-zinc-700">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <TypeBadge type={record.type} />
              <span className="text-xs text-zinc-500">{formatDate(record.date)}</span>
              {record.secret && (
                <span className="rounded-full bg-violet-600/20 px-2 py-0.5 text-xs text-violet-300">Secreto</span>
              )}
            </div>
            <h3 className="font-semibold text-zinc-50">{record.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{record.description}</p>
            {evidenceCount !== undefined && evidenceCount > 0 && (
              <p className="mt-1 text-xs text-teal-500">📎 {evidenceCount} adjunto{evidenceCount !== 1 ? "s" : ""}</p>
            )}
          </div>
          <span className="text-zinc-600">›</span>
        </div>
      </Card>
    </Link>
  );
}

export function PersonCard({ person, recordCount }: { person: Person; recordCount?: number }) {
  return (
    <Link href={`/health/people/${person.id}`}>
      <Card className="transition hover:border-zinc-700">
        <h3 className="font-semibold text-zinc-50">{person.name}</h3>
        {person.relationship && <p className="mt-1 text-sm text-zinc-400">{person.relationship}</p>}
        {recordCount !== undefined && recordCount > 0 && (
          <p className="mt-1 text-xs text-zinc-500">{recordCount} registro{recordCount !== 1 ? "s" : ""}</p>
        )}
      </Card>
    </Link>
  );
}
