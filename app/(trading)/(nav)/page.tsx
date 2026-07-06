import { ClassicDashboard } from "@/app/components/dashboard/ClassicDashboard";
import { DashboardViewSwitch } from "@/app/components/dashboard/DashboardViewSwitch";

export default async function DashboardPage() {
  return (
    <>
      <div className="mb-4 flex justify-end">
        <DashboardViewSwitch mode="classic" />
      </div>
      <ClassicDashboard />
    </>
  );
}
