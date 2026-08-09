"use client";

import { useEffect, useState, useTransition } from "react";
import { getEntityNeighborhoodAction } from "@/app/argus/actions";
import type { V2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import { V2EntityNeighborhoodPanel } from "./V2EntityNeighborhoodPanel";

/**
 * Lazy-loads an entity neighborhood for Home Intelligence docks (Treemap / Portfolio / Tags).
 */
export function V2HomeNeighborhoodViewer({
  entityId,
  entityName,
  variant = "dock",
}: {
  entityId: string | null;
  entityName?: string;
  variant?: "dock" | "inline";
}) {
  const [graph, setGraph] = useState<V2EntityNeighborhoodGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!entityId) {
      setGraph(null);
      setError(null);
      return;
    }
    let cancelled = false;
    startTransition(async () => {
      setError(null);
      const result = await getEntityNeighborhoodAction(entityId);
      if (cancelled) return;
      if ("error" in result) {
        setGraph(null);
        setError(result.error);
        return;
      }
      setGraph(result.graph);
    });
    return () => {
      cancelled = true;
    };
  }, [entityId]);

  if (!entityId) return null;

  const name = entityName?.trim() || graph?.nodes.find((n) => n.id === entityId)?.name || "entity";

  if (pending && !graph) {
    return (
      <div
        className={`rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-3 py-4 text-center text-xs text-zinc-600 ${
          variant === "dock" ? "" : "mt-3"
        }`}
      >
        Loading neighborhood…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-3 py-4 text-center text-xs text-zinc-600 ${
          variant === "dock" ? "" : "mt-3"
        }`}
      >
        Neighborhood unavailable.
      </div>
    );
  }

  if (!graph) return null;

  return (
    <div className={variant === "dock" ? "mt-3" : "mt-4"}>
      <V2EntityNeighborhoodPanel graph={graph} entityName={name} variant={variant === "dock" ? "dock" : "full"} />
    </div>
  );
}
