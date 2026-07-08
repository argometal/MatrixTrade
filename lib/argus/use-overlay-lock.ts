"use client";

import { useEffect } from "react";

/** Lock body scroll while a full-screen overlay is open. */
export function useOverlayLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    document.body.classList.add("argus-overlay-open");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.classList.remove("argus-overlay-open");
      document.body.style.overflow = prev;
    };
  }, [active]);
}
