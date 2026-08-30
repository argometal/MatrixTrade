import { redirect } from "next/navigation";

/** Legacy /ai-workspace — use Control → Apply for AI Blocks. */
export default function AiWorkspaceRedirectPage() {
  redirect("/mxt/home-preview");
}
