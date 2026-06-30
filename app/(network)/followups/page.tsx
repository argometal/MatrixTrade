"use client";

import { useRouter } from "next/navigation";
import { ConversationCard } from "@/app/components/network-vault/Cards";
import { Button, EmptyState, PageHeader } from "@/app/components/network-vault/ui";
import { useVault } from "@/lib/network-vault/useVault";

export default function FollowUpsPage() {
  const router = useRouter();
  const { ready, getFollowUps, markFollowUpDone } = useVault();

  if (!ready) {
    return <p className="text-center text-zinc-500">Loading...</p>;
  }

  const followUps = getFollowUps();

  function handleMarkDone(conversationId: string, contactId: string) {
    markFollowUpDone(conversationId);
    router.refresh();
  }

  return (
    <>
      <PageHeader
        title="Follow-ups"
        subtitle={`${followUps.length} pending`}
      />

      {followUps.length === 0 ? (
        <EmptyState message="No pending follow-ups. You're all caught up!" />
      ) : (
        <div className="space-y-3">
          {followUps.map((c) => (
            <div key={c.id} className="space-y-2">
              <ConversationCard
                contactName={c.contact.name}
                date={c.date}
                context={c.nextStep || c.context}
                notes={c.notes}
                followUpDate={c.followUpDate}
                href={`/contacts/${c.contactId}`}
              />
              <Button
                variant="secondary"
                fullWidth
                onClick={() => handleMarkDone(c.id, c.contactId)}
              >
                Mark follow-up done
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
