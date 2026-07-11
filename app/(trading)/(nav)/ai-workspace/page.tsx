import { redirect } from "next/navigation";

export default function AiWorkspaceRedirectPage() {
  redirect("/home-preview?panel=assistant");
}
