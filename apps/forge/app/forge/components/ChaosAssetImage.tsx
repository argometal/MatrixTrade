"use client";

/**
 * Minimal IndexedDB image preview for Chaos captures (24-2E / 24-1C assets).
 */

import { useEffect, useState } from "react";
import {
  chaosAssetsAvailability,
  createObjectUrl,
  revokeObjectUrl,
} from "@/lib/argusforge/af03-chaos-assets-idb";

export function ChaosAssetImage({
  assetId,
  alt,
  className,
}: {
  assetId: string;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    const avail = chaosAssetsAvailability();
    if (!avail.ok) {
      setError("Image unavailable");
      return;
    }
    createObjectUrl(assetId)
      .then((u) => {
        if (!active) {
          if (u) revokeObjectUrl(u);
          return;
        }
        if (!u) {
          setError("Image unavailable");
          return;
        }
        objectUrl = u;
        setUrl(u);
      })
      .catch(() => {
        if (active) setError("Image unavailable");
      });
    return () => {
      active = false;
      if (objectUrl) revokeObjectUrl(objectUrl);
    };
  }, [assetId]);

  if (error) {
    return (
      <p role="status" className="rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1.5 text-[11px] text-zinc-500">
        {error}
      </p>
    );
  }
  if (!url) {
    return <p className="text-[11px] text-zinc-600">Loading image…</p>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className ?? "max-h-48 w-full rounded-lg object-contain"} />;
}
