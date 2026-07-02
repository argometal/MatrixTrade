import { InboxCard } from "@/app/argus/components/Cards";
import { EmptyState, PageHeader } from "@/app/argus/components/ui";
import { getInboxItems } from "@/lib/argus/server-storage";

export default async function InboxPage() {
  const pending = await getInboxItems("pending");

  return (
    <>
        <PageHeader title="Inbox" subtitle="Pending items to convert or archive" backHref="/argus/journal" />
      {pending.length === 0 ? (
        <EmptyState message="Inbox empty. Send content to POST /api/argus/inbox." />
      ) : (
        <div className="space-y-3">
          {pending.map((item) => (
            <InboxCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}
