import type { Attachment, Entity, InboxItem, Log } from "../types";

export const EXPORT_MANIFEST_VERSION = "1.0.0";

export type ExportPackageKind = "evidence_vault" | "pdf_deliver";

/** UI package types — pdf_deliver, quick_package, evidence_dossier, evidence_vault export today. */
export type DeliverPackageKind =
  | "recognition_report"
  | "incident_package"
  | "knowledge_package"
  | "relationship_brief"
  | "pdf_deliver"
  | "quick_package"
  | "evidence_dossier"
  | "evidence_vault";

export type QuickDeliverSummary = {
  scopeType: ExportScopeType;
  scopeId: string;
  scopeName: string;
  generatedAt: string;
  evidenceCount: number;
  logCount: number;
  inboxCount: number;
  fileCount: number;
  relatedEntityCount: number;
  containsPrivate: boolean;
};

export type ExportCollectionOptions = {
  fromDate?: string;
  toDate?: string;
  includeLogs?: boolean;
  includeInbox?: boolean;
  includeAttachments?: boolean;
};

export type ExportPreviewSummary = {
  scopeType: ExportScopeType;
  scopeId: string;
  scopeName: string;
  evidenceCount: number;
  logCount: number;
  inboxCount: number;
  fileCount: number;
  estimatedBytes: number;
  dateLabel: string;
  containsPrivate: boolean;
};

export type ExportScopeType = "person" | "project" | "organization" | "topic" | "event";

export type ExportScope = {
  type: ExportScopeType;
  id: string;
  name: string;
};

export type EvidenceCrossReference = {
  inboxId: string;
  logId: string;
  relation: "converted";
};

export type ExportTimelineEntry = {
  id: string;
  sourceType: "log" | "inbox";
  kind: "email" | "journal" | "meeting" | "note";
  date: string;
  time?: string;
  title: string;
  body?: string;
  tags?: string[];
  private: boolean;
  crossRefId?: string;
  crossRefType?: "log" | "inbox";
};

export type ExportEvidencePayload = {
  scope: ExportScope;
  logs: Log[];
  inbox: InboxItem[];
  crossReferences: EvidenceCrossReference[];
  attachments: Array<
    Pick<Attachment, "id" | "fileName" | "mimeType" | "createdAt" | "parentType" | "parentId"> & {
      zipPath: string;
    }
  >;
  relatedEntityIds: string[];
};

export type ExportTimelinePayload = {
  scope: ExportScope;
  entries: ExportTimelineEntry[];
  emailCount: number;
};

export type ExportManifestHashes = Record<string, string>;

export type ExportSourceIds = {
  logIds: string[];
  inboxIds: string[];
  attachmentIds: string[];
  entityIds: string[];
};

export type ExportManifest = {
  version: string;
  exportedAt: string;
  packageType: ExportPackageKind;
  scopeType: ExportScopeType;
  scopeId: string;
  scopeName: string;
  includePrivate: boolean;
  containsPrivate: boolean;
  evidenceCount: number;
  fileCount: number;
  hashes: ExportManifestHashes;
  sourceIds: ExportSourceIds;
  dateFrom?: string | null;
  dateTo?: string | null;
  includes?: {
    logs: boolean;
    inbox: boolean;
    attachments: boolean;
  };
};

export type CollectedVaultEvidence = {
  scope: ExportScope;
  entity: Entity;
  logs: Log[];
  inbox: InboxItem[];
  attachments: Attachment[];
  crossReferences: EvidenceCrossReference[];
  relatedEntityIds: string[];
  containsPrivate: boolean;
};

export type VaultZipEntry = {
  path: string;
  content: Buffer;
};

export type VaultZipResult = {
  buffer: Buffer;
  manifest: ExportManifest;
};
