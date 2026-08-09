import { Suspense } from "react";
import { V2HelpShell } from "./components/V2HelpShell";

export default function V2HelpPage() {
  return (
    <Suspense fallback={<div className="px-4 py-8 text-sm text-zinc-500">Loading help…</div>}>
      <V2HelpShell />
    </Suspense>
  );
}
