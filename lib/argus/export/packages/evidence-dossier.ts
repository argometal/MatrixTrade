import { readAttachmentBytes } from "../../server-storage";
import type { DeliverBranding } from "../deliver-branding";
import { buildExportEvidencePayload, buildExportManifest, buildExportTimeline, sha256Hex } from "../manifest";
import type { ArgusData } from "../../types";
import type { CollectedVaultEvidence } from "../types";
import { buildVaultZipBuffer } from "../writers/zip-writer";
import { buildEvidenceDossierHtml } from "./evidence-dossier-html";

export type EvidenceDossierResult = {
  html: string;
  buffer: Buffer;
  manifest: ReturnType<typeof buildExportManifest>;
};

export async function buildEvidenceDossierZip(input: {
  data: ArgusData;
  collected: CollectedVaultEvidence;
  includePrivate: boolean;
  generatedAt: string;
  branding: DeliverBranding;
  options?: import("../types").ExportCollectionOptions;
}): Promise<EvidenceDossierResult> {
  const { data, collected, includePrivate, generatedAt, branding, options } = input;
  const evidencePayload = buildExportEvidencePayload(collected);
  const timelinePayload = buildExportTimeline(collected);
  const reportHtml = buildEvidenceDossierHtml({
    data,
    collected,
    generatedAt,
    branding,
    zipMode: true,
  });

  const evidenceJson = Buffer.from(JSON.stringify(evidencePayload, null, 2), "utf8");
  const timelineJson = Buffer.from(JSON.stringify(timelinePayload, null, 2), "utf8");
  const reportBuffer = Buffer.from(reportHtml, "utf8");

  const hashes: Record<string, string> = {
    "evidence.json": sha256Hex(evidenceJson),
    "timeline.json": sha256Hex(timelineJson),
    "report.html": sha256Hex(reportBuffer),
  };

  const fileEntries: Array<{ path: string; content: Buffer }> = [];

  if (options?.includeAttachments !== false) {
    for (const attachment of collected.attachments) {
      const bytes = await readAttachmentBytes(attachment.id);
      if (!bytes) continue;
      const zipPath = `files/${attachment.id}`;
      fileEntries.push({ path: zipPath, content: bytes });
      hashes[zipPath] = sha256Hex(bytes);
    }
  }

  const manifest = buildExportManifest({
    collected: {
      ...collected,
      attachments: collected.attachments.filter((att) =>
        fileEntries.some((entry) => entry.path === `files/${att.id}`)
      ),
    },
    includePrivate,
    hashes,
    options,
  });
  const manifestJson = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");
  hashes["manifest.json"] = sha256Hex(manifestJson);

  const buffer = await buildVaultZipBuffer([
    { path: "manifest.json", content: manifestJson },
    { path: "report.html", content: reportBuffer },
    { path: "evidence.json", content: evidenceJson },
    { path: "timeline.json", content: timelineJson },
    ...fileEntries,
  ]);

  return { html: reportHtml, buffer, manifest };
}
