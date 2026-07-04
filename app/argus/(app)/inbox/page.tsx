import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { InboxCard } from "@/app/argus/components/Cards";
import { EmptyState, PageHeader } from "@/app/argus/components/ui";
import { getInboxItems } from "@/lib/argus/server-storage";
import { INBOX } from "@/lib/argus/ux-copy";

export default async function InboxPage() {
  const includePrivate = await hasArgusPrivateUnlock();
  const items = await getInboxItems(undefined, includePrivate);

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
