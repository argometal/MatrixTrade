"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Entity } from "@/lib/argus/types";
import {
  createMissingLinkTargetAction,
  saveUnifiedCreateFlowAction,
} from "@/app/argus/actions";
import type { EntityPickerBuckets } from "@/app/argus/components/ReferencePickerModal";
import type {
  CreateFlowOpenOptions,
  CreateItemKind,
  JournalLinkRow,
  LinkFilterKind,
  UnifiedCreatePayload,
  UnifiedCreateResult,
} from "@/lib/argus/create-flow-types";
import {
  entityLinkFilterKind,
  filterEntitiesForLinkTab,
} from "@/lib/argus/create-flow-helpers";
import { filterEntityPickerBuckets } from "@/lib/argus/link-hierarchy";
import { formatArgusError } from "@/lib/argus/persistence/errors";
import { entityKindLabel, entityNotesForDisplay, type ReferenceKind } from "@/lib/argus/reference-types";

export function defaultLogDateTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function postCreateHref(
  pathname: string,
  kind: CreateItemKind,
  id: string,
  fallback: string
): string {
  if (kind === "journal") return `/argus/logs/${id}`;
  if (!pathname.startsWith("/argus/v2")) return fallback;
  switch (kind) {
    case "organization":
      return `/argus/v2/organizations/${id}`;
    case "project":
      return `/argus/v2/projects/${id}`;
    case "topic":
      return `/argus/v2/browse/topics?selected=${id}`;
    case "event":
      return `/argus/v2/browse/events?selected=${id}`;
    default:
      return `/argus/network/${id}`;
  }
}

export function countLinks(entities: Entity[], entityIds: string[], logIds: string[]) {
  const counts = {
    person: 0,
    organization: 0,
    project: 0,
    event: 0,
    topic: 0,
    document: 0,
    journal: logIds.length,
  };
  for (const id of entityIds) {
    const entity = entities.find((entry) => entry.id === id);
    if (!entity) continue;
    const kind = entityLinkFilterKind(entity);
    if (kind && kind !== "all" && kind !== "journal") counts[kind] += 1;
  }
  return counts;
}

export type MissingFormState = {
  name: string;
  detail: string;
  extra: string;
};

export function useCreateLinkFlowState({
  open,
  options,
  buckets,
  journalRows,
  onClose,
  onSaved,
}: {
  open: boolean;
  options: CreateFlowOpenOptions;
  buckets: EntityPickerBuckets;
  journalRows: JournalLinkRow[];
  onClose: () => void;
  onSaved?: (result: UnifiedCreateResult) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const mode = options.mode ?? "create";
  const lockItemKind = options.lockItemKind ?? false;
  const [itemKind, setItemKind] = useState<CreateItemKind>(options.itemKind ?? "journal");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [notes, setNotes] = useState("");
  const [eventDate, setEventDate] = useState(defaultLogDateTime());
  const [tags, setTags] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [template, setTemplate] = useState("standard");
  const [entryType, setEntryType] = useState<"log" | "note">("log");
  const [linkTab, setLinkTab] = useState<LinkFilterKind>("all");
  const [linkQuery, setLinkQuery] = useState("");
  const [draftEntityIds, setDraftEntityIds] = useState<string[]>(options.linkedEntityIds ?? []);
  const [draftLogIds, setDraftLogIds] = useState<string[]>(options.linkedLogIds ?? []);
  const [missingOpen, setMissingOpen] = useState(true);
  const [missingDrafts, setMissingDrafts] = useState<Record<string, MissingFormState>>({});
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const filteredBuckets = useMemo(
    () => filterEntityPickerBuckets(buckets, "create"),
    [buckets]
  );

  const allEntities = filteredBuckets.alphabetical;

  useEffect(() => {
    if (!open) return;
    setItemKind(options.itemKind ?? "journal");
    setName("");
    setTitle("");
    setBody("");
    setNotes("");
    setEventDate(defaultLogDateTime());
    setTags("");
    setTagInput("");
    setTemplate("standard");
    setEntryType(options.entryType ?? "log");
    setLinkTab("all");
    setLinkQuery("");
    setDraftEntityIds(options.linkedEntityIds ?? []);
    setDraftLogIds(options.linkedLogIds ?? []);
    setMissingOpen(true);
    setMissingDrafts({});
    setError(null);
    setFlash(null);
  }, [open, options]);

  const filteredEntities = useMemo(() => {
    const withoutSelf =
      mode === "link" && options.entityId
        ? allEntities.filter((entity) => entity.id !== options.entityId)
        : allEntities;
    const byTab = filterEntitiesForLinkTab(withoutSelf, linkTab);
    const q = linkQuery.trim().toLowerCase();
    if (!q) return byTab.slice(0, 40);
    return byTab.filter(
      (entity) =>
        entity.name.toLowerCase().includes(q) ||
        entity.notes.toLowerCase().includes(q) ||
        entityKindLabel(entity).toLowerCase().includes(q)
    );
  }, [allEntities, linkQuery, linkTab, mode, options.entityId]);

  const filteredJournalRows = useMemo(() => {
    const q = linkQuery.trim().toLowerCase();
    if (!q) return journalRows;
    return journalRows.filter(
      (row) =>
        row.title.toLowerCase().includes(q) ||
        row.preview.toLowerCase().includes(q) ||
        row.kind.toLowerCase().includes(q)
    );
  }, [journalRows, linkQuery]);

  const linkCounts = useMemo(
    () => countLinks(allEntities, draftEntityIds, draftLogIds),
    [allEntities, draftEntityIds, draftLogIds]
  );

  const totalLinks = draftEntityIds.length + draftLogIds.length;
  const tagList = tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  function toggleEntity(id: string) {
    setDraftEntityIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }

  function toggleLog(id: string) {
    setDraftLogIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }

  function addTag(raw: string) {
    const next = raw.trim();
    if (!next) return;
    const merged = [...new Set([...tagList, next])];
    setTags(merged.join(", "));
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags(tagList.filter((value) => value !== tag).join(", "));
  }

  function canSave(): boolean {
    if (mode === "link") return true;
    if (itemKind === "journal") return body.trim().length > 0;
    return name.trim().length > 0;
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        const payload: UnifiedCreatePayload = {
          mode,
          itemKind,
          name: name.trim(),
          title: title.trim(),
          body: body.trim(),
          notes: entityNotesForDisplay(notes),
          eventDate,
          tags: tagList,
          entryType,
          linkedEntityIds: draftEntityIds,
          linkedLogIds: draftLogIds,
          entityId: options.entityId,
        };

        const result = await saveUnifiedCreateFlowAction(payload);
        onSaved?.(result);
        onClose();

        if (mode === "create" && !onSaved) {
          router.push(postCreateHref(pathname, itemKind, result.id, result.href));
        }
        router.refresh();
      } catch (err) {
        const { layer, message } = formatArgusError(err);
        setError(`${layer.toUpperCase()}: ${message}`);
      }
    });
  }

  function updateMissingDraft(kind: string, patch: Partial<MissingFormState>) {
    setMissingDrafts((current) => ({
      ...current,
      [kind]: {
        ...{ name: "", detail: "", extra: "" },
        ...current[kind],
        ...patch,
      },
    }));
  }

  function handleMissingCreate(kind: ReferenceKind | "document") {
    const draft = missingDrafts[kind] ?? { name: "", detail: "", extra: "" };
    const draftName = draft.name.trim();
    if (!draftName) return;
    const notesText = [draft.detail.trim(), draft.extra.trim()].filter(Boolean).join("\n");
    setError(null);
    startTransition(async () => {
      try {
        const created = await createMissingLinkTargetAction(
          kind,
          draftName,
          notesText,
          kind === "event"
            ? { startDate: draft.extra.trim().slice(0, 10) || new Date().toISOString().slice(0, 10) }
            : undefined
        );
        setDraftEntityIds((current) =>
          current.includes(created.id) ? current : [...current, created.id]
        );
        setMissingDrafts((current) => ({
          ...current,
          [kind]: { name: "", detail: "", extra: "" },
        }));
        setFlash(`Created and linked: ${created.name}`);
      } catch (err) {
        const { layer, message } = formatArgusError(err);
        setError(`${layer.toUpperCase()}: ${message}`);
      }
    });
  }

  return {
    mode,
    lockItemKind,
    itemKind,
    setItemKind,
    name,
    setName,
    title,
    setTitle,
    body,
    setBody,
    notes,
    setNotes,
    eventDate,
    setEventDate,
    tagList,
    tagInput,
    setTagInput,
    addTag,
    removeTag,
    template,
    setTemplate,
    entryType,
    setEntryType,
    linkTab,
    setLinkTab,
    linkQuery,
    setLinkQuery,
    draftEntityIds,
    draftLogIds,
    missingOpen,
    setMissingOpen,
    missingDrafts,
    updateMissingDraft,
    error,
    flash,
    isPending,
    allEntities,
    filteredEntities,
    filteredJournalRows,
    linkCounts,
    totalLinks,
    toggleEntity,
    toggleLog,
    canSave,
    handleSave,
    handleMissingCreate,
  };
}
