import { SituationRoomDashboard } from "@/app/components/home-preview/SituationRoomDashboard";
import { loadSituationRoomData } from "@/lib/situation-room";

export default async function HomePreviewPage() {
  const data = await loadSituationRoomData();
  return <SituationRoomDashboard data={data} />;
}
