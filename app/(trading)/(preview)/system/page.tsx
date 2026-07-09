import { PreviewSystem } from "@/app/components/system/PreviewSystem";
import { loadSystemPageData } from "@/lib/system-page-data";

export default async function SystemPage({
  searchParams,
}: {
  searchParams: Promise<{ syncOk?: string; syncError?: string }>;
}) {
  const syncParams = await searchParams;
  const data = await loadSystemPageData();

  return <PreviewSystem data={data} syncOk={syncParams.syncOk} syncError={syncParams.syncError} />;
}
