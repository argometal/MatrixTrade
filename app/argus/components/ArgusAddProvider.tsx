"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, Suspense, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createLogAction, setEntityLinkedIdsAction } from "@/app/argus/actions";
import { ArgusCreateLinkWindow } from "@/app/argus/components/ArgusCreateLinkWindow";
import {
  ArgusLinkModal,
  type ArgusLinkFilter,
  type ArgusLinkResult,
} from "@/app/argus/components/ArgusLinkModal";
import type { CreatedEntityResult } from "@/app/argus/actions";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import type { TagBuckets } from "@/app/argus/components/TagPickerModal";
import { LINK_HIERARCHY } from "@/lib/argus/ux-copy";
import type { CreateFlowOpenOptions, JournalLinkRow, UnifiedCreateResult } from "@/lib/argus/create-flow-types";
import { CaptureSheet, type CaptureInitial } from "./CaptureSheet";
import { AddContextFlow } from "./AddContextFlow";

export type CaptureOpenOptions = {
  openReference?: boolean;
  entityIds?: string[];
  eventDate?: string;
  body?: string;
  title?: string;
};

type CreateFlowState = CreateFlowOpenOptions & {
  onSaved?: (result: UnifiedCreateResult) => void;
};

export type LinkModalOpenOptions = {
  title?: string;
  subtitle?: string;
  entityId?: string;
  linkedEntityIds?: string[];
  selectedTags?: string[];
  showTags?: boolean;
  buckets?: EntityPickerBuckets;
  initialFilter?: ArgusLinkFilter;
  onConfirm?: (result: ArgusLinkResult) => void | Promise<void>;
  onEntityCreated?: (entity: CreatedEntityResult) => void | Promise<void | false>;
};

type ArgusAddContextValue = {
  openCapture: (options?: CaptureOpenOptions) => void;
  openAddContext: () => void;
  openCreateFlow: (options?: CreateFlowState) => void;
  openLinkModal: (options?: LinkModalOpenOptions) => void;
  buckets: EntityPickerBuckets;
  tagBuckets: TagBuckets;
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
  const [addContextOpen, setAddContextOpen] = useState(false);
  const [autoOpenReference, setAutoOpenReference] = useState(false);
  const [captureInitial, setCaptureInitial] = useState<CaptureInitial | undefined>();
  const [createFlowOpen, setCreateFlowOpen] = useState(false);
  const [createFlowState, setCreateFlowState] = useState<CreateFlowState>({});
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalState, setLinkModalState] = useState<LinkModalOpenOptions>({});
  const onSavedRef = useRef<CreateFlowState["onSaved"]>(undefined);
  const onLinkConfirmRef = useRef<LinkModalOpenOptions["onConfirm"]>(undefined);

  useEffect(() => {
    if (!createFlowOpen && !linkModalOpen && !addContextOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [createFlowOpen, linkModalOpen, addContextOpen]);

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
      eventDate: options?.eventDate,
      body: options?.body,
      title: options?.title,
    });
    setAutoOpenReference(Boolean(options?.openReference));
    setCaptureOpen(true);
  }, []);

  const openAddContext = useCallback(() => {
    setAddContextOpen(true);
  }, []);

  const closeAddContext = useCallback(() => {
    setAddContextOpen(false);
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

  const closeLinkModal = useCallback(() => {
    setLinkModalOpen(false);
    setLinkModalState({});
    onLinkConfirmRef.current = undefined;
  }, []);

  const openLinkModal = useCallback((options: LinkModalOpenOptions = {}) => {
    onLinkConfirmRef.current = options.onConfirm;
    setLinkModalState(options);
    setLinkModalOpen(true);
  }, []);

  const handleContextCreated = useCallback(
    (result: CreatedEntityResult) => {
      openLinkModal({
        entityId: result.id,
        linkedEntityIds: [],
        title: "Link",
        subtitle: `Connect ${result.name} to related people, projects, topics, and events.`,
        showTags: false,
      });
    },
    [openLinkModal]
  );

  const handleLinkConfirm = useCallback(
    async (result: ArgusLinkResult) => {
      const custom = onLinkConfirmRef.current ?? linkModalState.onConfirm;
      if (custom) {
        await custom(result);
      } else if (linkModalState.entityId) {
        await setEntityLinkedIdsAction(linkModalState.entityId, result.entityIds);
        router.refresh();
      }
      closeLinkModal();
    },
    [closeLinkModal, linkModalState, router]
  );

  return (
    <ArgusAddContext.Provider value={{ openCapture, openAddContext, openCreateFlow, openLinkModal, buckets, tagBuckets }}>
      {children}
      <AddContextFlow open={addContextOpen} onClose={closeAddContext} onCreated={handleContextCreated} />
      <ArgusCreateLinkWindow
        open={createFlowOpen}
        onClose={closeCreateFlow}
        options={createFlowState}
        buckets={buckets}
        journalRows={journalRows}
        onSaved={(result) => onSavedRef.current?.(result)}
      />
      <ArgusLinkModal
        open={linkModalOpen}
        buckets={linkModalState.buckets ?? buckets}
        tagBuckets={tagBuckets}
        title={linkModalState.title ?? "Link"}
        subtitle={linkModalState.subtitle ?? LINK_HIERARCHY.inboxLinkHint}
        selectedEntityIds={linkModalState.linkedEntityIds ?? []}
        selectedTags={linkModalState.selectedTags ?? []}
        showTags={linkModalState.showTags ?? true}
        initialFilter={linkModalState.initialFilter ?? "all"}
        excludeEntityIds={linkModalState.entityId ? [linkModalState.entityId] : []}
        onConfirm={handleLinkConfirm}
        onClose={closeLinkModal}
        onEntityCreated={linkModalState.onEntityCreated}
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
