"use client";

import { useState } from "react";
import { ContactCard } from "@/app/components/network-vault/Cards";
import { Button, EmptyState, inputClass, PageHeader } from "@/app/components/network-vault/ui";
import { useVault } from "@/lib/network-vault/useVault";

export default function ContactsPage() {
  const { ready, getContacts, searchContacts } = useVault();
  const [query, setQuery] = useState("");

  if (!ready) {
    return <p className="text-center text-zinc-500">Loading...</p>;
  }

  const contacts = query ? searchContacts(query) : getContacts();

  return (
    <>
      <PageHeader title="Contacts" subtitle={`${getContacts().length} people in your network`} />

      <div className="mb-4">
        <input
          type="search"
          placeholder="Search name, company, role..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="mb-4">
        <Button href="/contacts/new" fullWidth>
          + Add Contact
        </Button>
      </div>

      {contacts.length === 0 ? (
        <EmptyState message={query ? "No contacts match your search." : "No contacts yet."} />
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      )}
    </>
  );
}
