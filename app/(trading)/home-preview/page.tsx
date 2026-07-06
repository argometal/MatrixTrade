import { DashboardViewSwitch } from "@/app/components/dashboard/DashboardViewSwitch";
import { SituationRoomDashboard } from "@/app/components/home-preview/SituationRoomDashboard";
import { loadSituationRoomData } from "@/lib/situation-room";

export default async function HomePreviewPage() {
  const data = await loadSituationRoomData();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <DashboardViewSwitch mode="preview" />
      </div>
      <SituationRoomDashboard data={data} />
    </div>
  );
}
