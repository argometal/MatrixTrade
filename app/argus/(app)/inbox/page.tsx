import { InboxCard } from "@/app/argus/components/Cards";
import { EmptyState, PageHeader } from "@/app/argus/components/ui";
import { getInboxItems } from "@/lib/argus/server-storage";
import { INBOX } from "@/lib/argus/ux-copy";

export default async function InboxPage() {
  const items = await getInboxItems();

  return (
    <>
      <PageHeader title={INBOX.title} subtitle={INBOX.subtitle} backHref="/argus/journal" />
      {items.length === 0 ? (
        <EmptyState message={`${INBOX.empty} ${INBOX.emptyHint}`} />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <InboxCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}
