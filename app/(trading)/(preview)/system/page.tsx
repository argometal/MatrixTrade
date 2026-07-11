import { PreviewSystem } from "@/app/components/system/PreviewSystem";
import { mechanicsSnapshotItem } from "@/lib/snapshot-packages";
import { loadSystemPageData } from "@/lib/system-page-data";

export default async function SystemPage({
  searchParams,
}: {
  searchParams: Promise<{ syncOk?: string; syncError?: string }>;
}) {
  const syncParams = await searchParams;
  const data = await loadSystemPageData();
  const mechanicsSnapshot = [mechanicsSnapshotItem()];

  return (
    <PreviewSystem
      data={data}
      syncOk={syncParams.syncOk}
      syncError={syncParams.syncError}
      mechanicsSnapshot={mechanicsSnapshot}
    />
  );
}
