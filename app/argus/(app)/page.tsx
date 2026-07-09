import { redirect } from "next/navigation";

export default async function ArgusRootPage() {
  redirect("/argus/v2");
}
