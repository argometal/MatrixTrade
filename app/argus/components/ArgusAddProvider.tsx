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

function ArgusAddProviderInner({
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
  const searchParams = useSearchParams();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [autoOpenReference, setAutoOpenReference] = useState(false);

  const closeCapture = useCallback(() => {
    setCaptureOpen(false);
    setAutoOpenReference(false);
    if (searchParams.get("capture") || searchParams.get("reference")) {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("capture");
      next.delete("reference");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }
  }, [pathname, router, searchParams]);

  const openCapture = useCallback((options?: { openReference?: boolean }) => {
    setAutoOpenReference(Boolean(options?.openReference));
    setCaptureOpen(true);
  }, []);

  useEffect(() => {
    if (searchParams.get("capture") === "1") {
      openCapture({ openReference: searchParams.get("reference") === "1" });
    }
  }, [openCapture, searchParams]);

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
    </ArgusAddContext.Provider>
  );
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
  return (
    <Suspense fallback={children}>
      <ArgusAddProviderInner buckets={buckets} tagBuckets={tagBuckets}>
        {children}
      </ArgusAddProviderInner>
    </Suspense>
  );
}
