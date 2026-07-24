"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { RealmLifecycleFilter } from "@/lib/argusforge/af03-realm-map";
import { RealmMapTree } from "../components/RealmMapTree";

function parseFilter(raw: string | null): RealmLifecycleFilter {
  if (raw === "archive" || raw === "focus" || raw === "active") return raw;
  return "active";
}

function ArgusTreemapInner() {
  const params = useSearchParams();
  const filter = parseFilter(params.get("filter"));
  return <RealmMapTree filter={filter} />;
}

/**
 * CHANGE 24-17 — Argus macro view = Realm Treemap.
 * Unit engine graph lives at /forge/argus/units.
 */
export default function ForgeArgusPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading Argus…</p>}>
      <ArgusTreemapInner />
    </Suspense>
  );
}
