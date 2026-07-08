"use client";

import { useEffect, useRef } from "react";

/** Scroll the list row matching `data-v2-selected-id` into view after navigation. */
export function useScrollToSelected(selectedId?: string) {
  const lastScrolled = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!selectedId || lastScrolled.current === selectedId) return;
    lastScrolled.current = selectedId;

    const frame = requestAnimationFrame(() => {
      const el = document.querySelector(`[data-v2-selected-id="${selectedId}"]`);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });

    return () => cancelAnimationFrame(frame);
  }, [selectedId]);
}
