"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, Suspense, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createLogAction } from "@/app/argus/actions";
import { ArgusCreateLinkWindow } from "@/app/argus/components/ArgusCreateLinkWindow";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import type { TagBuckets } from "@/app/argus/components/TagPickerModal";
import type { CreateFlowOpenOptions, JournalLinkRow, UnifiedCreateResult } from "@/lib/argus/create-flow-types";
import { CaptureSheet, type CaptureInitial } from "./CaptureSheet";

export type CaptureOpenOptions = {
  openReference?: boolean;
  entityIds?: string[];
  entryType?: "log" | "note";
  eventDate?: string;
};

type CreateFlowState = CreateFlowOpenOptions & {
  onSaved?: (result: UnifiedCreateResult) => void;
};

type ArgusAddContextValue = {
  openCapture: (options?: CaptureOpenOptions) => void;
  openCreateFlow: (options?: CreateFlowState) => void;
  buckets: EntityPickerBuckets;
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
  journalRows,
}: {
  children: ReactNode;
  buckets: EntityPickerBuckets;
  tagBuckets: TagBuckets;
  journalRows: JournalLinkRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [autoOpenReference, setAutoOpenReference] = useState(false);
  const [captureInitial, setCaptureInitial] = useState<CaptureInitial | undefined>();
  const [createFlowOpen, setCreateFlowOpen] = useState(false);
  const [createFlowState, setCreateFlowState] = useState<CreateFlowState>({});
  const onSavedRef = useRef<CreateFlowState["onSaved"]>(undefined);

  useEffect(() => {
    if (!createFlowOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [createFlowOpen]);

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

  const closeCreateFlow = useCallback(() => {
    setCreateFlowOpen(false);
    setCreateFlowState({});
  }, []);

  const openCreateFlow = useCallback((options: CreateFlowState = {}) => {
    onSavedRef.current = options.onSaved;
    setCreateFlowState(options);
    setCreateFlowOpen(true);
  }, []);

  return (
    <ArgusAddContext.Provider value={{ openCapture, openCreateFlow, buckets }}>
      {children}
      <ArgusCreateLinkWindow
        open={createFlowOpen}
        onClose={closeCreateFlow}
        options={createFlowState}
        buckets={buckets}
        journalRows={journalRows}
        onSaved={(result) => onSavedRef.current?.(result)}
      />
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
