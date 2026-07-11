import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ARGUS_AUTH } from "@/lib/auth/cookies";
import { hasArgusPrivateUnlock } from "@/lib/auth/cookies";
import { argusPrivateConfigured } from "@/lib/auth/passwords";
import { collectVaultEvidence } from "@/lib/argus/export/collect-evidence";
import { deliverFilenamePrefix, resolveDeliverBranding } from "@/lib/argus/export/deliver-branding";
import { isDeliverPackageAvailable } from "@/lib/argus/export/deliver-catalog";
import { buildPdfDeliver } from "@/lib/argus/export/packages/pdf-deliver";
import { buildEvidenceVaultZip } from "@/lib/argus/export/packages/vault";
import type { DeliverPackageKind, ExportCollectionOptions, ExportScopeType } from "@/lib/argus/export/types";
import { getInboxItems, readArgus } from "@/lib/argus/server-storage";

const SCOPE_TYPES = new Set<ExportScopeType>([
  "person",
  "project",
  "organization",
  "topic",
  "event",
]);

function safeFileToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "export";
}

function parseOptions(body: Record<string, unknown>): ExportCollectionOptions {
  return {
    fromDate: String(body.fromDate ?? "").trim() || undefined,
    toDate: String(body.toDate ?? "").trim() || undefined,
    includeLogs: body.includeLogs !== false,
    includeInbox: body.includeInbox !== false,
    includeAttachments: body.includeAttachments !== false,
  };
}

export async function POST(request: Request) {
  const jar = await cookies();
  if (jar.get(ARGUS_AUTH)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    package?: string;
    scopeType?: string;
    scopeId?: string;
    includePrivate?: boolean;
    fromDate?: string;
    toDate?: string;
    includeLogs?: boolean;
    includeInbox?: boolean;
    includeAttachments?: boolean;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const packageKind = (body.package ?? "pdf_deliver") as DeliverPackageKind;
  if (!isDeliverPackageAvailable(packageKind)) {
    return NextResponse.json({ error: "Package not available yet" }, { status: 400 });
  }

  const scopeType = body.scopeType as ExportScopeType | undefined;
  const scopeId = String(body.scopeId ?? "").trim();
  if (!scopeType || !SCOPE_TYPES.has(scopeType) || !scopeId) {
    return NextResponse.json({ error: "scopeType and scopeId are required" }, { status: 400 });
  }

  const includePrivate = Boolean(body.includePrivate);
  if (includePrivate) {
    if (!argusPrivateConfigured()) {
      return NextResponse.json({ error: "Private export requested but PIN is not configured" }, { status: 400 });
    }
    if (!(await hasArgusPrivateUnlock())) {
      return NextResponse.json({ error: "Private unlock required" }, { status: 403 });
    }
  }

  const options = parseOptions(body);
  const [data, inboxItems] = await Promise.all([readArgus(), getInboxItems(undefined, true)]);
  const collected = collectVaultEvidence({
    data,
    inboxItems,
    scopeType,
    scopeId,
    includePrivate,
    options,
  });

  if (!collected) {
    return NextResponse.json({ error: "Scope not found or type mismatch" }, { status: 404 });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const nameToken = safeFileToken(collected.scope.name);

  if (packageKind === "pdf_deliver") {
    try {
      const generatedAt = new Date().toISOString();
      const branding = resolveDeliverBranding();
      const buffer = await buildPdfDeliver({ data, collected, generatedAt, branding });
      const prefix = deliverFilenamePrefix("pdf");
      const filename = `${prefix}-${scopeType}-${nameToken}-${stamp}.pdf`;

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(buffer.length),
          "Cache-Control": "no-store",
          "X-Argus-Package": "pdf_deliver",
          "X-Argus-Evidence-Count": String(collected.logs.length + collected.inbox.length),
          "X-Argus-File-Count": String(collected.attachments.length),
        },
      });
    } catch (error) {
      console.error("[argus/export] PDF deliver failed", error);
      const message = error instanceof Error ? error.message : "PDF generation failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const { buffer, manifest } = await buildEvidenceVaultZip({ collected, includePrivate, options });
  const prefix = deliverFilenamePrefix("vault");
  const filename = `${prefix}-${scopeType}-${nameToken}-${manifest.exportedAt.slice(0, 10)}.zip`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
      "X-Argus-Package": "evidence_vault",
      "X-Argus-Evidence-Count": String(manifest.evidenceCount),
      "X-Argus-File-Count": String(manifest.fileCount),
    },
  });
}
