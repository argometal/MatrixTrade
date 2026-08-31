import { redirect } from "next/navigation";

/**
 * Enter Trade deprecated — execution lives in Scout + Control → Apply.
 * Preserve query (plan / ticker / thesis) onto /mxt/scout.
 */
export default async function TradesPreviewRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  const plan = typeof sp.plan === "string" ? sp.plan : undefined;
  const ticker = typeof sp.ticker === "string" ? sp.ticker : undefined;
  const thesis = typeof sp.thesis === "string" ? sp.thesis : undefined;
  if (plan) params.set("plan", plan);
  if (thesis) params.set("thesis", thesis);
  void ticker;
  const qs = params.toString();
  redirect(qs ? `/mxt/scout?${qs}` : "/mxt/scout");
}
