import { redirect } from "next/navigation";

/** Legacy list route → v2 Network browser (relationship intelligence UI). */
export default function NetworkPage() {
  redirect("/argus/v2/browse/network");
}
