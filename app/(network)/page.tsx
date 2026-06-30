"use client";

import { ConversationCard } from "@/app/components/network-vault/Cards";
import { Button, EmptyState, PageHeader, StatCard } from "@/app/components/network-vault/ui";
import { useVault } from "@/lib/network-vault/useVault";

export default function DashboardPage() {
  const { ready, getContacts, getDueFollowUps, getRecentConversations } = useVault();

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  const contacts = getContacts();
  const dueFollowUps = getDueFollowUps();
  const recentConversations = getRecentConversations(5);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Your relationship memory"
      />

      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard label="Contacts" value={contacts.length} accent="emerald" />
        <StatCard label="Follow-ups due" value={dueFollowUps.length} accent="amber" />
      </div>

      <div className="mb-6 flex flex-col gap-3">
        <Button href="/contacts/new" fullWidth>
          + Add Contact
        </Button>
        <Button href="/conversations/new" variant="secondary" fullWidth>
          + Add Conversation
        </Button>
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Follow-ups due
          </h2>
          {dueFollowUps.length > 0 && (
            <a href="/followups" className="text-xs text-emerald-400">
              View all
            </a>
          )}
        </div>
        {dueFollowUps.length === 0 ? (
          <EmptyState message="No follow-ups due. You're all caught up!" />
        ) : (
          <div className="space-y-3">
            {dueFollowUps.slice(0, 3).map((c) => (
              <ConversationCard
                key={c.id}
                contactName={c.contact.name}
                date={c.date}
                context={c.nextStep}
                notes={c.notes}
                followUpDate={c.followUpDate}
                href={`/contacts/${c.contactId}`}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Recent conversations
        </h2>
        {recentConversations.length === 0 ? (
          <EmptyState message="No conversations yet. Start building your network memory." />
        ) : (
          <div className="space-y-3">
            {recentConversations.map((c) => (
              <ConversationCard
                key={c.id}
                contactName={c.contact.name}
                date={c.date}
                context={c.context}
                notes={c.notes}
                href={`/contacts/${c.contactId}`}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
