"use client";

import { useEffect, useState, useTransition } from "react";
import { getEntityNeighborhoodAction } from "@/app/argus/actions";
import type { V2EntityNeighborhoodGraph } from "@/lib/argus/v2/intelligence-viz";
import { V2EntityNeighborhoodPanel } from "./V2EntityNeighborhoodPanel";

/**
 * Home Intelligence neighborhood.
 * - `local` + inline = Tags-model main graph (zoom / explore).
 * - `context` + dock = small right rail (one level up, or wider neighborhood).
 */
export function V2HomeNeighborhoodViewer({
  entityId,
  entityName,
  variant = "dock",
  scope = "local",
}: {
  entityId: string | null;
  entityName?: string;
  variant?: "dock" | "inline";
  /** local = selected entity; context = parent / wider (dock). */
  scope?: "local" | "context";
}) {
  const [graph, setGraph] = useState<V2EntityNeighborhoodGraph | null>(null);
  const [contextTitle, setContextTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!entityId) {
      setGraph(null);
      setContextTitle(null);
      setError(null);
      return;
    }
    let cancelled = false;
    startTransition(async () => {
      setError(null);
      const result = await getEntityNeighborhoodAction(entityId, { scope });
      if (cancelled) return;
      if ("error" in result) {
        setGraph(null);
        setContextTitle(null);
        setError(result.error);
        return;
      }
      setGraph(result.graph);
      setContextTitle(result.contextTitle ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [entityId, scope]);

  if (!entityId) return null;

  const name =
    entityName?.trim() || graph?.nodes.find((n) => n.id === entityId)?.name || "entity";
  const panelName =
    scope === "context" && contextTitle
      ? contextTitle.replace(/^[^·]+·\s*/, "")
      : name;

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
      {scope === "context" && contextTitle ? (
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          {contextTitle}
        </p>
      ) : null}
      <V2EntityNeighborhoodPanel
        graph={graph}
        entityName={panelName}
        variant={variant === "dock" ? "dock" : "full"}
        title={scope === "context" ? "Context neighborhood" : "Connection neighborhood"}
      />
    </div>
  );
}
