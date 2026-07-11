import { redirect } from "next/navigation";

export default function ExchangePage() {
  redirect("/home-preview?panel=assistant");
}
