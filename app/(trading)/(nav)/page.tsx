import { redirect } from "next/navigation";

/** Legacy `/` trading page → canonical MXT dashboard. */
export default function DashboardPage() {
  redirect("/mxt/home-preview");
}
