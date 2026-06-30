"use client";

import { useParams, useRouter } from "next/navigation";
import { ConversationCard } from "@/app/components/network-vault/Cards";
import {
  Button,
  Card,
  EmptyState,
  formatDate,
  isOverdue,
  PageHeader,
} from "@/app/components/network-vault/ui";
import { useVault } from "@/lib/network-vault/useVault";

export default function ContactProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { ready, getContact, getConversations, getLatestConversation, markFollowUpDone } =
    useVault();

  if (!ready) {
    return <p className="text-center text-zinc-500">Loading...</p>;
  }

  const contact = getContact(id);
  if (!contact) {
    return (
      <>
        <PageHeader title="Not found" backHref="/contacts" />
        <EmptyState message="Contact not found." />
      </>
    );
  }

  const conversations = getConversations(id);
  const latest = getLatestConversation(id);

  function handleMarkDone() {
    if (latest?.followUpDate) {
      markFollowUpDone(latest.id);
      router.refresh();
    }
  }

  return (
    <>
      <PageHeader title={contact.name} backHref="/contacts" />

      <Card className="mb-4">
        <div className="space-y-2 text-sm">
          {contact.role && contact.company && (
            <p className="text-lg font-medium text-zinc-200">
              {contact.role} · {contact.company}
            </p>
          )}
          {contact.location && <p className="text-zinc-400">📍 {contact.location}</p>}
          {contact.phone && (
            <p>
              <a href={`tel:${contact.phone}`} className="text-emerald-400">
                {contact.phone}
              </a>
            </p>
          )}
          {contact.email && (
            <p>
              <a href={`mailto:${contact.email}`} className="text-emerald-400">
                {contact.email}
              </a>
            </p>
          )}
          {contact.linkedin && (
            <p>
              <a
                href={`https://${contact.linkedin.replace(/^https?:\/\//, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400"
              >
                LinkedIn
              </a>
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {contact.category && (
              <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">
                {contact.category}
              </span>
            )}
            {contact.status && (
              <span className="rounded-full bg-emerald-600/20 px-2.5 py-0.5 text-xs text-emerald-400">
                {contact.status}
              </span>
            )}
          </div>
          {contact.whereMet && (
            <p className="text-zinc-500">
              Met at {contact.whereMet}
              {contact.dateMet ? ` · ${formatDate(contact.dateMet)}` : ""}
            </p>
          )}
          {contact.notes && <p className="pt-2 text-zinc-300">{contact.notes}</p>}
        </div>
      </Card>

      {latest && (
        <Card className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Next follow-up
          </h2>
          {latest.followUpDate ? (
            <div className="flex items-center justify-between">
              <p
                className={`text-lg font-semibold ${
                  isOverdue(latest.followUpDate) ? "text-red-400" : "text-amber-400"
                }`}
              >
                {formatDate(latest.followUpDate)}
              </p>
              <Button variant="secondary" onClick={handleMarkDone}>
                Mark done
              </Button>
            </div>
          ) : (
            <p className="text-zinc-500">No pending follow-up</p>
          )}
          {latest.nextStep && (
            <p className="mt-2 text-sm text-zinc-400">{latest.nextStep}</p>
          )}
        </Card>
      )}

      <div className="mb-6 flex flex-col gap-3">
        <Button href={`/contacts/${id}/conversation/new`} fullWidth>
          + Add Conversation
        </Button>
        <Button href={`/contacts/${id}/edit`} variant="secondary" fullWidth>
          Edit Contact
        </Button>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Conversation timeline
        </h2>
        {conversations.length === 0 ? (
          <EmptyState message="No conversations yet." />
        ) : (
          <div className="space-y-3">
            {conversations.map((c) => (
              <Card key={c.id}>
                <p className="text-xs text-zinc-500">{formatDate(c.date)}</p>
                {c.context && <p className="mt-1 text-sm text-zinc-400">{c.context}</p>}
                {c.notes && <p className="mt-2 text-sm text-zinc-200">{c.notes}</p>}
                {c.interests && (
                  <p className="mt-2 text-xs text-zinc-500">
                    <span className="font-medium text-zinc-400">Cares about:</span> {c.interests}
                  </p>
                )}
                {c.problems && (
                  <p className="mt-1 text-xs text-zinc-500">
                    <span className="font-medium text-zinc-400">Problems:</span> {c.problems}
                  </p>
                )}
                {c.opportunities && (
                  <p className="mt-1 text-xs text-zinc-500">
                    <span className="font-medium text-zinc-400">Opportunities:</span>{" "}
                    {c.opportunities}
                  </p>
                )}
                {c.promises && (
                  <p className="mt-1 text-xs text-zinc-500">
                    <span className="font-medium text-zinc-400">Promised:</span> {c.promises}
                  </p>
                )}
                {c.nextStep && (
                  <p className="mt-2 text-sm text-emerald-400">Next: {c.nextStep}</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
