import { Suspense } from "react";
import { PreviewInbox } from "@/app/components/inbox/PreviewInbox";
import { PageHelpPanel } from "@/app/components/preview/PageHelpPanel";
import { fetchBridgeInbox } from "@/lib/bridge";
import { listPendingInboxForRuntime } from "@/lib/trading-inbox-submit";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ applied?: string; error?: string }>;
}) {
  const params = await searchParams;
  const workerItems = await fetchBridgeInbox();
  const items = await listPendingInboxForRuntime(workerItems);

  return (
    <Suspense fallback={null}>
      <PageHelpPanel pageId="inbox">
        <PreviewInbox items={items} applied={params.applied} error={params.error} />
      </PageHelpPanel>
    </Suspense>
  );
}
