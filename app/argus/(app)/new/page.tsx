import { redirect } from "next/navigation";

export default function LegacyNewJournalPage() {
  redirect("/argus/v2?capture=1");
}
