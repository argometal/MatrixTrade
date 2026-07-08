import { redirect } from "next/navigation";
import { ClassicDashboard } from "@/app/components/dashboard/ClassicDashboard";

/** `/` redirects to Dashboard (`/home-preview`). Use `/?classic=1` for light classic view. */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ classic?: string }>;
}) {
  const { classic } = await searchParams;
  if (classic) {
    return <ClassicDashboard />;
  }
  redirect("/home-preview");
}
