import Link from "next/link";
import { Card, formatDate, StatusBadge, TypeBadge } from "./ui";
import type { Contact, Entry, Evidence } from "@/lib/argus/types";
import { EVIDENCE_TYPE_LABELS, INTERACTION_LABELS } from "@/lib/argus/labels";

export function EntryCard({ entry, evidenceCount }: { entry: Entry; evidenceCount?: number }) {
  return (
    <Link href={`/argus/entries/${entry.id}`}>
      <Card className="transition hover:border-zinc-700">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap gap-2">
              <TypeBadge type={entry.type} />
              <StatusBadge status={entry.status} />
              {entry.private && (
                <span className="rounded-full bg-violet-600/20 px-2.5 py-0.5 text-xs font-medium text-violet-300">
                  Private
                </span>
              )}
              {entry.interactionKind && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${entry.interactionKind === "positive" ? "bg-emerald-600/20 text-emerald-400" : "bg-red-600/20 text-red-400"}`}
                >
                  {INTERACTION_LABELS[entry.interactionKind]}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-zinc-50">{entry.title}</h3>
            <p className="mt-1 text-xs text-zinc-500">{formatDate(entry.date)}</p>
            <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{entry.description}</p>
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

export function ContactCard({ contact, entryCount }: { contact: Contact; entryCount?: number }) {
  return (
    <Link href={`/argus/contacts/${contact.id}`}>
      <Card className="transition hover:border-zinc-700">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-zinc-50">{contact.name}</h3>
            <p className="text-sm text-zinc-400">
              {contact.role} · {contact.department}
            </p>
            <span className="mt-2 inline-block rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">
              {contact.relationship}
            </span>
            {entryCount !== undefined && (
              <p className="mt-2 text-xs text-zinc-500">
                {entryCount} {entryCount !== 1 ? "entries" : "entry"}
              </p>
            )}
          </div>
          <span className="text-zinc-600">›</span>
        </div>
      </Card>
    </Link>
  );
}
