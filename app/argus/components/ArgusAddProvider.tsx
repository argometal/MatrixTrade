"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, Suspense, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createLogAction } from "@/app/argus/actions";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import type { TagBuckets } from "@/app/argus/components/TagPickerModal";
import { CaptureSheet, type CaptureInitial } from "./CaptureSheet";

export type CaptureOpenOptions = {
  openReference?: boolean;
  entityIds?: string[];
  entryType?: "log" | "note";
  eventDate?: string;
};

type ArgusAddContextValue = {
  openCapture: (options?: CaptureOpenOptions) => void;
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
  onOpen: (options?: CaptureOpenOptions) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("capture") !== "1") return;
    const eventId = searchParams.get("eventId");
    onOpen({
      openReference: searchParams.get("reference") === "1",
      entityIds: eventId ? [eventId] : undefined,
      entryType: "note",
    });
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
  const [captureInitial, setCaptureInitial] = useState<CaptureInitial | undefined>();

  const closeCapture = useCallback(() => {
    setCaptureOpen(false);
    setAutoOpenReference(false);
    setCaptureInitial(undefined);
    const params = new URLSearchParams(window.location.search);
    if (params.get("capture") || params.get("reference") || params.get("eventId")) {
      params.delete("capture");
      params.delete("reference");
      params.delete("eventId");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }
  }, [pathname, router]);

  const openCapture = useCallback((options?: CaptureOpenOptions) => {
    setCaptureInitial({
      entityIds: options?.entityIds,
      entryType: options?.entryType ?? "note",
      eventDate: options?.eventDate,
    });
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
        initial={captureInitial}
        onClose={closeCapture}
        autoOpenReference={autoOpenReference}
      />
      <Suspense fallback={null}>
        <CaptureDeepLinkSync onOpen={openCapture} />
      </Suspense>
    </ArgusAddContext.Provider>
  );
}
