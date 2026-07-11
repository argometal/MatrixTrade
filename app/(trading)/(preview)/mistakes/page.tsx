import { redirect } from "next/navigation";

export default function MistakesPage() {
  redirect("/stats?tab=mistakes");
}
