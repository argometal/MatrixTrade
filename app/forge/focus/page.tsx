import { redirect } from "next/navigation";

/**
 * Focus filter — CHANGE 24-17 redirects into Argus Treemap (same Realms, no copy).
 * Focus intelligence remains pending.
 */
export default function ForgeFocusPendingPage() {
  redirect("/forge/argus?filter=focus");
}
