import Link from "next/link";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { ENTRY_TYPE_LABELS, INTERACTION_LABELS } from "@/lib/argus/labels";
import { getContact, getEntry, getEvidence } from "@/lib/argus/server-storage";
import { EvidenceCard } from "@/app/argus/components/Cards";
import { Button, Card, EmptyState, formatDate, PageHeader, StatusBadge, TypeBadge } from "@/app/argus/components/ui";

export default async function EntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const includePrivate = await hasArgusPrivateUnlock();
  const entry = await getEntry(id, includePrivate);

  if (!entry) {
    return (
      <>
        <PageHeader title="Not found" backHref="/argus/entries" />
        <EmptyState message="Entry not found or requires private unlock." />
      </>
    );
  }

  const evidence = await getEvidence(id, includePrivate);
  const contacts = (
    await Promise.all(entry.contactIds.map((cid) => getContact(cid)))
  ).filter(Boolean);

  return (
    <>
      <PageHeader title={entry.title} backHref="/argus/entries" />
      <Card className="mb-4">
        <div className="mb-3 flex flex-wrap gap-2">
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
        <p className="text-xs text-zinc-500">
          {ENTRY_TYPE_LABELS[entry.type]} · {formatDate(entry.date)}
        </p>
        <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">{entry.description}</p>
        {entry.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {entry.tags.map((t) => (
              <span key={t} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                #{t}
              </span>
            ))}
          </div>
        )}
        {contacts.length > 0 && (
          <div className="mt-4 border-t border-zinc-800 pt-3">
            <p className="mb-2 text-xs font-medium uppercase text-zinc-500">Contacts</p>
            {contacts.map(
              (c) =>
                c && (
                  <p key={c.id} className="text-sm text-zinc-300">
                    {c.name} · {c.relationship}
                  </p>
                )
            )}
          </div>
        )}
      </Card>

      <Button href={`/argus/entries/${id}/evidence/new`} fullWidth className="mb-6">
        + Add evidence
      </Button>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Evidence ({evidence.length})
        </h2>
        {evidence.length === 0 ? (
          <EmptyState message="No evidence yet. Add emails, messages, recordings, or files." />
        ) : (
          <div className="space-y-3">
            {evidence.map((e) => (
              <div key={e.id}>
                <EvidenceCard item={e} />
                {e.attachmentName && (
                  <Link
                    href={`/api/argus/files/${e.id}`}
                    className="mt-1 inline-block text-xs text-teal-500 underline"
                  >
                    Download attachment
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
