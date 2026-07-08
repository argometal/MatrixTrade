import { notFound } from "next/navigation";
import { PreviewInboxDetail } from "@/app/components/inbox/PreviewInboxDetail";
import { fetchBridgeInbox } from "@/lib/bridge";
import { getInboxItemById } from "@/lib/trading-inbox-storage";

type InboxDetailSearchParams = {
  origin?: string;
  error?: string;
  applied?: string;
  playbookId?: string;
  type?: string;
  tradeId?: string;
  store?: string;
  verified?: string;
  message?: string;
  verifyDetail?: string;
  inboxError?: string;
};

function resolveOrigin(origin: string | undefined): "local" | "supabase" | "worker" {
  if (origin === "local") return "local";
  if (origin === "supabase") return "supabase";
  return "worker";
}

export default async function InboxDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<InboxDetailSearchParams>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const origin = resolveOrigin(query.origin);
  const isApplyResult = query.applied === "1";

  const workerItems = await fetchBridgeInbox();
  const item = await getInboxItemById(id, workerItems, origin);

  if (!item && !isApplyResult) notFound();

  return (
    <PreviewInboxDetail
      id={id}
      origin={origin}
      item={item}
      isApplyResult={isApplyResult}
      query={query}
    />
  );
}
