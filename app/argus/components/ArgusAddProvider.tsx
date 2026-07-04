"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, Suspense, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createLogAction } from "@/app/argus/actions";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import type { TagBuckets } from "@/app/argus/components/TagPickerModal";
import { CaptureSheet } from "./CaptureSheet";

type ArgusAddContextValue = {
  openCapture: (options?: { openReference?: boolean }) => void;
};

const ArgusAddContext = createContext<ArgusAddContextValue | null>(null);

export function useArgusAdd() {
  const value = useContext(ArgusAddContext);
  if (!value) {
    throw new Error("useArgusAdd must be used within ArgusAddProvider");
  }
  return value;
}

function CaptureDeepLinkSync({
  onOpen,
}: {
  onOpen: (options?: { openReference?: boolean }) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("capture") === "1") {
      onOpen({ openReference: searchParams.get("reference") === "1" });
    }
  }, [onOpen, searchParams]);

  return null;
}

export function ArgusAddProvider({
  children,
  buckets,
  tagBuckets,
}: {
  children: ReactNode;
  buckets: EntityPickerBuckets;
  tagBuckets: TagBuckets;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [autoOpenReference, setAutoOpenReference] = useState(false);

  const closeCapture = useCallback(() => {
    setCaptureOpen(false);
    setAutoOpenReference(false);
    const params = new URLSearchParams(window.location.search);
    if (params.get("capture") || params.get("reference")) {
      params.delete("capture");
      params.delete("reference");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }
  }, [pathname, router]);

  const openCapture = useCallback((options?: { openReference?: boolean }) => {
    setAutoOpenReference(Boolean(options?.openReference));
    setCaptureOpen(true);
  }, []);

  return (
    <ArgusAddContext.Provider value={{ openCapture }}>
      {children}
      <CaptureSheet
        open={captureOpen}
        action={createLogAction}
        buckets={buckets}
        tagBuckets={tagBuckets}
        onClose={closeCapture}
        autoOpenReference={autoOpenReference}
      />
      <Suspense fallback={null}>
        <CaptureDeepLinkSync onOpen={openCapture} />
      </Suspense>
    </ArgusAddContext.Provider>
  );
}
