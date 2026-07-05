"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ImportAiBlockActionResult } from "@/app/actions";
import type { AiBridgeLiveSnapshot } from "@/lib/ai-bridge-live-snapshot";
import { AiBridgeClassicView } from "./AiBridgeClassicView";
import { AiBridgeV2Panel } from "./AiBridgeV2Panel";

export type AiBridgeView = "classic" | "v2";

const STORAGE_KEY = "matrixtrade-ai-bridge-view";

function parseView(value: string | null): AiBridgeView {
  return value === "classic" ? "classic" : "v2";
}

export function AiBridgeShell({
  snapshotText,
  liveSnapshot,
  pendingInboxCount,
  pendingInboxPreview,
  importAction,
  initialView,
}: {
  snapshotText: string;
  liveSnapshot: AiBridgeLiveSnapshot;
  pendingInboxCount: number;
  pendingInboxPreview: Array<{ id: string; origin: string; summary: string }>;
  importAction: (formData: FormData) => Promise<ImportAiBlockActionResult>;
  initialView: AiBridgeView;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setViewState] = useState<AiBridgeView>(initialView);

  useEffect(() => {
    const fromUrl = searchParams.get("view");
    if (fromUrl) {
      setViewState(parseView(fromUrl));
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "classic" || stored === "v2") {
        setViewState(stored);
      }
    } catch {
      /* ignore */
    }
  }, [searchParams]);

  useEffect(() => {
    const nav = document.getElementById("trading-top-nav");
    const container = document.getElementById("trading-layout-container");
    if (view === "v2") {
      nav?.classList.add("hidden");
      container?.classList.remove("mx-auto", "max-w-5xl", "px-4", "py-6", "sm:py-8");
      container?.classList.add("max-w-none", "p-0");
    } else {
      nav?.classList.remove("hidden");
      container?.classList.add("mx-auto", "max-w-5xl", "px-4", "py-6", "sm:py-8");
      container?.classList.remove("max-w-none", "p-0");
    }
    return () => {
      nav?.classList.remove("hidden");
      container?.classList.add("mx-auto", "max-w-5xl", "px-4", "py-6", "sm:py-8");
      container?.classList.remove("max-w-none", "p-0");
    };
  }, [view]);

  const setView = useCallback(
    (next: AiBridgeView) => {
      setViewState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", next);
      router.replace(`/ai-bridge?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const toggle = (
    <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 text-xs font-medium">
      <button
        type="button"
        onClick={() => setView("v2")}
        className={`rounded-md px-3 py-1.5 transition ${
          view === "v2"
            ? "bg-white text-violet-900 shadow-sm"
            : "text-zinc-600 hover:text-zinc-900"
        }`}
      >
        New design
      </button>
      <button
        type="button"
        onClick={() => setView("classic")}
        className={`rounded-md px-3 py-1.5 transition ${
          view === "classic"
            ? "bg-white text-zinc-900 shadow-sm"
            : "text-zinc-600 hover:text-zinc-900"
        }`}
      >
        Classic
      </button>
    </div>
  );

  if (view === "classic") {
    return (
      <AiBridgeClassicView
        snapshotText={snapshotText}
        pendingInboxCount={pendingInboxCount}
        pendingInboxPreview={pendingInboxPreview}
        importAction={importAction}
        viewToggle={toggle}
      />
    );
  }

  return (
    <AiBridgeV2Panel
      snapshotText={snapshotText}
      liveSnapshot={liveSnapshot}
      pendingInboxCount={pendingInboxCount}
      importAction={importAction}
      viewToggle={toggle}
    />
  );
}
