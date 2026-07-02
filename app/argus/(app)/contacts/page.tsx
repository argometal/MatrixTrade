import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { ContactCard } from "@/app/argus/components/Cards";
import { Button, EmptyState, PageHeader } from "@/app/argus/components/ui";
import { getContacts, getEntriesForContact } from "@/lib/argus/server-storage";

export default async function ContactsPage() {
  const includePrivate = await hasArgusPrivateUnlock();
  const contacts = await getContacts();

  return (
    <>
      <PageHeader title="Contacts" subtitle="Managers, colleagues, clients, partners" />
      <Button href="/argus/contacts/new" fullWidth className="mb-6">
        + New contact
      </Button>
      {contacts.length === 0 ? (
        <EmptyState message="No contacts yet." />
      ) : (
        <div className="space-y-3">
          {await Promise.all(
            contacts.map(async (c) => {
              const entries = await getEntriesForContact(c.id, includePrivate);
              return <ContactCard key={c.id} contact={c} entryCount={entries.length} />;
            })
          )}
        </div>
      )}
    </>
  );
}
