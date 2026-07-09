import { redirect } from "next/navigation";

/** `/` redirects to Dashboard (`/home-preview`). */
export default function DashboardPage() {
  redirect("/home-preview");
}
