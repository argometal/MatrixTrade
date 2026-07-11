import { redirect } from "next/navigation";

export default function JournalPage() {
  redirect("/stats?tab=journal");
}
