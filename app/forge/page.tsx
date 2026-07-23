import { redirect } from "next/navigation";

/** ArgusForge opens on Chaos Inbox. */
export default function ForgeIndexPage() {
  redirect("/forge/chaos");
}
