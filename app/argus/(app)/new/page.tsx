import { redirect } from "next/navigation";

export default function NewLogPage() {
  redirect("/argus/journal?capture=1");
}
