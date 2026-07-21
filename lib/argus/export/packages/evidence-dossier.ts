import { readAttachmentBytes } from "../../server-storage";
import type { DeliverBranding } from "../deliver-branding";
import { buildExportEvidencePayload, buildExportManifest, buildExportTimeline, sha256Hex } from "../manifest";
import type { ArgusData } from "../../types";
import type { CollectedVaultEvidence } from "../types";
import { buildVaultZipBuffer } from "../writers/zip-writer";
import { buildEvidenceDossierHtml } from "./evidence-dossier-html";
import {
  buildPortableArchiveReadme,
  buildPortableEml,
  buildPortableNoteMarkdown,
  portableFileToken,
} from "../portable-formats";

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
    "argus/evidence.json": sha256Hex(evidenceJson),
    "argus/timeline.json": sha256Hex(timelineJson),
    "evidence.json": sha256Hex(evidenceJson),
    "timeline.json": sha256Hex(timelineJson),
    "report.html": sha256Hex(reportBuffer),
  };

  const fileEntries: Array<{ path: string; content: Buffer }> = [];
  const usedAttachmentNames = new Set<string>();

  if (options?.includeAttachments !== false) {
    for (const attachment of collected.attachments) {
      const bytes = await readAttachmentBytes(attachment.id);
      if (!bytes) continue;
      const idPath = `files/${attachment.id}`;
      fileEntries.push({ path: idPath, content: bytes });
      hashes[idPath] = sha256Hex(bytes);

      const baseName = portableFileToken(attachment.fileName || attachment.id, "file");
      let humanName = baseName;
      let n = 2;
      while (usedAttachmentNames.has(humanName.toLowerCase())) {
        humanName = `${baseName}-${n}`;
        n += 1;
      }
      usedAttachmentNames.add(humanName.toLowerCase());
      const humanPath = `attachments/${humanName}`;
      fileEntries.push({ path: humanPath, content: bytes });
      hashes[humanPath] = sha256Hex(bytes);
    }
  }

  if (options?.includeInbox !== false) {
    for (const item of collected.inbox) {
      const { fileName, content } = buildPortableEml(item);
      const path = `emails/${fileName}`;
      fileEntries.push({ path, content });
      hashes[path] = sha256Hex(content);
    }
  }

  if (options?.includeLogs !== false) {
    for (const log of collected.logs) {
      const { fileName, content } = buildPortableNoteMarkdown(log);
      const path = `notes/${fileName}`;
      fileEntries.push({ path, content });
      hashes[path] = sha256Hex(content);
    }
  }

  const readme = Buffer.from(
    buildPortableArchiveReadme({
      scopeName: collected.scope.name,
      scopeType: collected.scope.type,
      generatedAt,
      emailCount: options?.includeInbox === false ? 0 : collected.inbox.length,
      noteCount: options?.includeLogs === false ? 0 : collected.logs.length,
      fileCount: fileEntries.filter((e) => e.path.startsWith("attachments/")).length,
    }),
    "utf8"
  );
  hashes["README.txt"] = sha256Hex(readme);

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
    { path: "README.txt", content: readme },
    { path: "manifest.json", content: manifestJson },
    { path: "report.html", content: reportBuffer },
    { path: "argus/evidence.json", content: evidenceJson },
    { path: "argus/timeline.json", content: timelineJson },
    // Compatibility copies at root for older vault tooling / docs
    { path: "evidence.json", content: evidenceJson },
    { path: "timeline.json", content: timelineJson },
    ...fileEntries,
  ]);

  return { html: reportHtml, buffer, manifest };
}
