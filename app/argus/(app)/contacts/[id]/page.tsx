import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { getContact, getEntriesForContact } from "@/lib/argus/server-storage";
import { EntryCard } from "@/app/argus/components/Cards";
import { Card, EmptyState, PageHeader } from "@/app/argus/components/ui";
import { evidenceCountForEntry, readArgus } from "@/lib/argus/server-storage";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const includePrivate = await hasArgusPrivateUnlock();
  const contact = await getContact(id);

  if (!contact) {
    return (
      <>
        <PageHeader title="Not found" backHref="/argus/contacts" />
        <EmptyState message="Contact not found." />
      </>
    );
  }

  const entries = await getEntriesForContact(id, includePrivate);
  const data = await readArgus();

  return (
    <>
      <PageHeader title={contact.name} backHref="/argus/contacts" />
      <Card className="mb-6">
        <p className="text-sm text-zinc-400">
          {contact.role} · {contact.department}
        </p>
        <p className="mt-2 text-sm text-zinc-300">{contact.relationship}</p>
        {contact.email && <p className="mt-2 text-sm text-zinc-400">{contact.email}</p>}
        {contact.phone && <p className="text-sm text-zinc-400">{contact.phone}</p>}
        {contact.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">{contact.notes}</p>}
      </Card>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Linked entries</h2>
      {entries.length === 0 ? (
        <EmptyState message="No linked entries." />
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <EntryCard key={e.id} entry={e} evidenceCount={evidenceCountForEntry(data, e.id)} />
          ))}
        </div>
      )}
    </>
  );
}
