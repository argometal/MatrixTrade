import { redirect } from "next/navigation";

export default async function LegacyJournalPage({
  searchParams,
}: {
  searchParams: Promise<{ capture?: string; eventId?: string; reference?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.capture) query.set("capture", params.capture);
  if (params.eventId) query.set("eventId", params.eventId);
  if (params.reference) query.set("reference", params.reference);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  redirect(`/argus/v2${suffix}`);
}
