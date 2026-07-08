import { redirect } from "next/navigation";

export default function ArgusDiagnosticsPage() {
  redirect("/argus/v2/diagnostics");
}
