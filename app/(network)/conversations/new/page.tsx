"use client";

import { ContactCard } from "@/app/components/network-vault/Cards";
import { EmptyState, inputClass, PageHeader } from "@/app/components/network-vault/ui";
import { useVault } from "@/lib/network-vault/useVault";
import Link from "next/link";
import { useState } from "react";

export default function PickContactForConversationPage() {
  const { ready, getContacts, searchContacts } = useVault();
  const [query, setQuery] = useState("");

  if (!ready) {
    return <p className="text-center text-zinc-500">Loading...</p>;
  }

  const contacts = query ? searchContacts(query) : getContacts();

  return (
    <>
      <PageHeader
        title="Add Conversation"
        subtitle="Pick a contact"
        backHref="/"
      />

      <div className="mb-4">
        <input
          type="search"
          placeholder="Search contacts..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={inputClass}
        />
      </div>

      {contacts.length === 0 ? (
        <EmptyState message="No contacts found. Add a contact first." />
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <Link key={contact.id} href={`/contacts/${contact.id}/conversation/new`}>
              <ContactCard contact={contact} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
