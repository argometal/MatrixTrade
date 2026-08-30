import { redirect } from "next/navigation";

/** Legacy /exchange — AI Block paste lives in Control → Apply, not Dashboard. */
export default function ExchangePage() {
  redirect("/mta/home-preview");
}
